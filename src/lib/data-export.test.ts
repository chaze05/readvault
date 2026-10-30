import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/blob", () => ({
  del: vi.fn(),
}));

vi.mock("./blob-claims", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./blob-claims")>();
  return {
    ...actual,
    assertBlobUrlsClaimedByUser: vi.fn(),
  };
});

vi.mock("./book-store", () => ({
  listBooks: vi.fn(),
}));

vi.mock("./preferences", () => ({
  getPreferences: vi.fn(),
}));

vi.mock("./db", () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("./password", () => ({
  verifyPassword: vi.fn(),
}));

vi.mock("./session-cookies", () => ({
  clearSessionCookie: vi.fn(),
}));

vi.mock("./users", () => ({
  findPasswordHashById: vi.fn(),
  findUserById: vi.fn(),
}));

import { del } from "@vercel/blob";

import {
  assertBlobUrlsClaimedByUser,
  BlobClaimError,
} from "./blob-claims";
import { listBooks } from "./book-store";
import { query, withTransaction } from "./db";
import {
  deleteAllUserContent,
  deleteUserAccount,
} from "./data-export";
import { verifyPassword } from "./password";
import { clearSessionCookie } from "./session-cookies";
import { findPasswordHashById, findUserById } from "./users";

const book = {
  id: "book-1",
  title: "A Book",
  author: "An Author",
  category: "Classics",
  description: null,
  fileName: "book.pdf",
  hasFile: true,
  fileUrl: "https://blob.example/book.pdf",
  totalPages: 10,
  currentPage: 1,
  status: "reading" as const,
  coverColor: "#315b45",
  isFavorite: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const storyRow = {
  id: "story-1",
  title: "A Story",
  story_type: "original" as const,
  source_title: null,
  description: null,
  age_range: null,
  language: "en",
  cover_image_path: "https://blob.example/cover.png",
  status: "published" as const,
  is_favorite: false,
  page_count: "1",
  current_page: "1",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const pageRow = {
  id: "page-1",
  story_id: "story-1",
  page_number: 1,
  content: "Once upon a time.",
  image_path: "https://blob.example/page-1.png",
  image_alt: null,
};

const user = {
  id: "user-1",
  email: "person@example.com",
  is_admin: false,
  session_version: 0,
  must_change_password: false,
};

const clientQuery = vi.fn();

function mockUserContent() {
  vi.mocked(listBooks).mockResolvedValue([book]);
  vi.mocked(assertBlobUrlsClaimedByUser).mockResolvedValue(undefined);
  vi.mocked(query).mockImplementation((async (text: string) => {
    if (text.includes("from public.stories s")) {
      return { rows: [storyRow] };
    }
    if (text.includes("from public.story_pages p")) {
      return { rows: [pageRow] };
    }
    if (text.includes("delete from public.users")) {
      return { rows: [], rowCount: 1 };
    }
    return { rows: [] };
  }) as never);
}

describe("deleteAllUserContent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUserContent();
    vi.mocked(del).mockResolvedValue(undefined);
    vi.mocked(withTransaction).mockImplementation((async (
      callback: (client: { query: typeof clientQuery }) => unknown
    ) => callback({ query: clientQuery })) as never);
    clientQuery.mockImplementation(async (text: string) => {
      if (text.includes("delete from public.books")) return { rowCount: 1 };
      if (text.includes("delete from public.stories")) return { rowCount: 1 };
      return { rowCount: 0 };
    });
  });

  it("deletes every scoped Blob before deleting database rows", async () => {
    const order: string[] = [];
    vi.mocked(del).mockImplementation(async () => {
      order.push("blob");
    });
    clientQuery.mockImplementation(async (text: string) => {
      order.push(text.includes("public.books") ? "books" : "stories");
      return { rowCount: 1 };
    });

    const result = await deleteAllUserContent("user-1");

    expect(del).toHaveBeenCalledTimes(3);
    expect(del).toHaveBeenCalledWith("https://blob.example/book.pdf");
    expect(del).toHaveBeenCalledWith("https://blob.example/cover.png");
    expect(del).toHaveBeenCalledWith("https://blob.example/page-1.png");
    expect(assertBlobUrlsClaimedByUser).toHaveBeenCalledWith("user-1", [
      "https://blob.example/book.pdf",
      "https://blob.example/cover.png",
      "https://blob.example/page-1.png",
    ]);
    expect(order).toEqual(["blob", "blob", "blob", "books", "stories"]);
    expect(result).toEqual({
      deletedBooks: 1,
      deletedStories: 1,
      deletedBlobs: 3,
    });
    expect(clientQuery).toHaveBeenCalledWith(
      "delete from public.books where user_id = $1",
      ["user-1"]
    );
    expect(clientQuery).toHaveBeenCalledWith(
      "delete from public.stories where user_id = $1",
      ["user-1"]
    );
  });

  it("refuses deletion when an owned URL has no claim", async () => {
    vi.mocked(assertBlobUrlsClaimedByUser).mockRejectedValue(
      new BlobClaimError(
        "Could not verify ownership of one or more stored files."
      )
    );

    await expect(deleteAllUserContent("user-1")).rejects.toThrow(
      "Could not verify ownership"
    );
    expect(del).not.toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();
    expect(clientQuery).not.toHaveBeenCalled();
  });

  it("throws before deleting database rows when any Blob deletion fails", async () => {
    vi.mocked(del).mockImplementation(async (url: string) => {
      if (url === "https://blob.example/cover.png") {
        throw new Error("Blob service unavailable");
      }
    });

    await expect(deleteAllUserContent("user-1")).rejects.toThrow(
      "No library content was removed"
    );
    expect(withTransaction).not.toHaveBeenCalled();
    expect(clientQuery).not.toHaveBeenCalled();
  });
});

describe("deleteUserAccount", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUserContent();
    vi.mocked(findUserById).mockResolvedValue(user);
    vi.mocked(findPasswordHashById).mockResolvedValue("password-hash");
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(clearSessionCookie).mockResolvedValue(undefined);
    vi.mocked(del).mockResolvedValue(undefined);
    vi.mocked(withTransaction).mockImplementation((async (
      callback: (client: { query: typeof clientQuery }) => unknown
    ) => callback({ query: clientQuery })) as never);
    clientQuery.mockResolvedValue({ rowCount: 1 });
  });

  it("requires the exact confirmation phrase", async () => {
    const result = await deleteUserAccount("user-1", {
      email: "person@example.com",
      password: "correct-horse",
      confirmation: "delete",
    });

    expect(result).toEqual({ error: "Type DELETE to confirm this action." });
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });

  it("requires the typed email to match the account", async () => {
    const result = await deleteUserAccount("user-1", {
      email: "someone@example.com",
      password: "correct-horse",
      confirmation: "DELETE",
    });

    expect(result).toEqual({
      error: "The email address you typed does not match your account.",
    });
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it("requires the current password", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);

    const result = await deleteUserAccount("user-1", {
      email: "person@example.com",
      password: "wrong-password",
      confirmation: "DELETE",
    });

    expect(result).toEqual({ error: "Current password is incorrect." });
    expect(withTransaction).not.toHaveBeenCalled();
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });

  it("deletes content, then the scoped user row, then clears the cookie", async () => {
    const order: string[] = [];
    vi.mocked(del).mockImplementation(async () => {
      order.push("blob");
    });
    vi.mocked(withTransaction).mockImplementation((async (
      callback: (client: { query: typeof clientQuery }) => unknown
    ) => {
      order.push("content");
      return callback({ query: clientQuery });
    }) as never);
    vi.mocked(query).mockImplementation((async (text: string) => {
      if (text.includes("from public.stories s")) {
        return { rows: [storyRow] };
      }
      if (text.includes("from public.story_pages p")) {
        return { rows: [pageRow] };
      }
      if (text.includes("delete from public.users")) {
        order.push("user");
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    }) as never);
    vi.mocked(clearSessionCookie).mockImplementation(async () => {
      order.push("cookie");
    });

    const result = await deleteUserAccount("user-1", {
      email: "person@example.com",
      password: "correct-horse",
      confirmation: "DELETE",
    });

    expect(result).toEqual({ ok: true });
    expect(verifyPassword).toHaveBeenCalledWith(
      "correct-horse",
      "password-hash"
    );
    expect(query).toHaveBeenCalledWith(
      "delete from public.users where id = $1",
      ["user-1"]
    );
    expect(order).toEqual(["blob", "blob", "blob", "content", "user", "cookie"]);
  });
});
