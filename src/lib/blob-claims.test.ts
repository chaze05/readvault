import { readFile } from "node:fs/promises";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  query: vi.fn(),
}));

import {
  assertBlobUrlsClaimedByUser,
  BlobClaimError,
  claimBlobPathname,
  isBlobPathnameClaimedByUser,
  normalizeBlobPathname,
} from "./blob-claims";
import { query } from "./db";

describe("normalizeBlobPathname", () => {
  it.each([
    [
      "https://store.public.blob.vercel-storage.com/readvault/uploads/book.pdf",
      "readvault/uploads/book.pdf",
    ],
    ["/readvault/story-images/cover.png", "readvault/story-images/cover.png"],
    ["readvault/uploads/book.pdf?download=1", "readvault/uploads/book.pdf"],
    ["readvault/uploads/book.pdf#page=1", "readvault/uploads/book.pdf"],
  ])("extracts %s", (input, expected) => {
    expect(normalizeBlobPathname(input)).toBe(expected);
  });

  it.each(["", "   ", "/", "readvault/../secret.pdf", "readvault\\secret.pdf"])(
    "rejects %j",
    (input) => {
      expect(normalizeBlobPathname(input)).toBeNull();
    }
  );
});

describe("blob_claims migration", () => {
  it("creates the claim table, user index, and backfill for every stored URL", async () => {
    const sql = await readFile(
      path.join(process.cwd(), "db", "migrations", "0003_blob_claims.sql"),
      "utf8"
    );

    expect(sql).toContain("create table if not exists public.blob_claims");
    expect(sql).toContain("pathname text not null unique");
    expect(sql).toContain("references public.users(id) on delete cascade");
    expect(sql).toContain(
      "create index if not exists blob_claims_user_idx"
    );
    expect(sql).toContain("b.file_path");
    expect(sql).toContain("s.cover_image_path");
    expect(sql).toContain("p.image_path");
    expect(sql).toContain("on conflict (pathname) do nothing");
  });
});

describe("claimBlobPathname", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("inserts a normalized claim before an upload token is issued", async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ id: "claim-1" }] } as never);

    await expect(
      claimBlobPathname(
        "user-1",
        "https://store.public.blob.vercel-storage.com/readvault/uploads/book.pdf"
      )
    ).resolves.toBe("readvault/uploads/book.pdf");

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("insert into public.blob_claims"),
      ["user-1", "readvault/uploads/book.pdf"]
    );
  });

  it("allows the same user to reuse an existing claim", async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [{ user_id: "user-1" }] } as never);

    await expect(
      claimBlobPathname("user-1", "/readvault/uploads/book.pdf")
    ).resolves.toBe("readvault/uploads/book.pdf");
  });

  it("rejects a pathname claimed by another user", async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [{ user_id: "user-2" }] } as never);

    await expect(
      claimBlobPathname("user-1", "readvault/uploads/book.pdf")
    ).rejects.toBeInstanceOf(BlobClaimError);
  });

  it("rejects invalid pathnames before querying", async () => {
    await expect(
      claimBlobPathname("user-1", "readvault/../book.pdf")
    ).rejects.toBeInstanceOf(BlobClaimError);
    expect(query).not.toHaveBeenCalled();
  });
});

describe("isBlobPathnameClaimedByUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("checks ownership using the normalized pathname", async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [{ pathname: "readvault/uploads/book.pdf" }],
    } as never);

    await expect(
      isBlobPathnameClaimedByUser(
        "user-1",
        "https://store.public.blob.vercel-storage.com/readvault/uploads/book.pdf"
      )
    ).resolves.toBe(true);
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      "user-1",
      "readvault/uploads/book.pdf",
    ]);
  });

  it("returns false when there is no matching claim", async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);

    await expect(
      isBlobPathnameClaimedByUser("user-1", "readvault/uploads/book.pdf")
    ).resolves.toBe(false);
  });
});

describe("assertBlobUrlsClaimedByUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("accepts a batch when every URL is claimed", async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        { pathname: "readvault/uploads/book.pdf" },
        { pathname: "readvault/story-images/cover.png" },
      ],
    } as never);

    await expect(
      assertBlobUrlsClaimedByUser("user-1", [
        "https://store.example/readvault/uploads/book.pdf",
        "https://store.example/readvault/story-images/cover.png",
      ])
    ).resolves.toBeUndefined();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("pathname = any($2::text[])"),
      [
        "user-1",
        ["readvault/uploads/book.pdf", "readvault/story-images/cover.png"],
      ]
    );
  });

  it("refuses the batch when an owned URL has no claim", async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [{ pathname: "readvault/uploads/book.pdf" }],
    } as never);

    await expect(
      assertBlobUrlsClaimedByUser("user-1", [
        "https://store.example/readvault/uploads/book.pdf",
        "https://store.example/readvault/story-images/other.png",
      ])
    ).rejects.toBeInstanceOf(BlobClaimError);
  });

  it("does not query for an empty batch", async () => {
    await expect(
      assertBlobUrlsClaimedByUser("user-1", [])
    ).resolves.toBeUndefined();
    expect(query).not.toHaveBeenCalled();
  });
});
