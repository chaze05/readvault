import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/current-user", () => ({
  requireActiveUser: vi.fn(),
}));

vi.mock("@/lib/bookmark-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bookmark-store")>();
  return {
    ...actual,
    deleteBookmark: vi.fn(),
    updateBookmarkNote: vi.fn(),
  };
});

import { NextRequest } from "next/server";

import {
  BookmarkNoteTooLongError,
  deleteBookmark,
  updateBookmarkNote,
} from "@/lib/bookmark-store";
import { requireActiveUser } from "@/lib/current-user";
import type { BookmarkItem } from "@/lib/types";

import { DELETE, PATCH } from "./route";

const bookmarkId = "33333333-3333-4333-8333-333333333333";

const user = {
  id: "db-user-1",
  email: "user@example.com",
  isAdmin: false,
  mustChangePassword: false,
  sessionVersion: 0,
};

const bookmark: BookmarkItem = {
  id: bookmarkId,
  kind: "book",
  targetId: "11111111-1111-4111-8111-111111111111",
  title: "The Book",
  pageNumber: 3,
  note: "Updated note",
  pageCount: 5,
  author: "Author Name",
  coverColor: "#315b45",
  coverImageUrl: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/bookmarks/${bookmarkId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }
  );
}

function deleteRequest(): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/bookmarks/${bookmarkId}`,
    { method: "DELETE" }
  );
}

function expectNoStore(response: Response) {
  expect(response.headers.get("cache-control")).toBe(
    "private, no-store, max-age=0, must-revalidate"
  );
  expect(response.headers.get("vary")).toBe("Cookie");
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(requireActiveUser).mockResolvedValue(user);
  vi.mocked(updateBookmarkNote).mockResolvedValue(bookmark);
  vi.mocked(deleteBookmark).mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PATCH /api/bookmarks/[id]", () => {
  it("returns 401 without an active user", async () => {
    vi.mocked(requireActiveUser).mockResolvedValue(null);

    const response = await PATCH(patchRequest({ note: "Updated note" }), context(bookmarkId));

    expect(response.status).toBe(401);
    expectNoStore(response);
    expect(updateBookmarkNote).not.toHaveBeenCalled();
  });

  it("rejects an invalid bookmark id", async () => {
    const response = await PATCH(patchRequest({ note: "Updated note" }), context("not-a-uuid"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid bookmark id.",
    });
    expectNoStore(response);
    expect(updateBookmarkNote).not.toHaveBeenCalled();
  });

  it("rejects an invalid note", async () => {
    const response = await PATCH(patchRequest({ note: "x".repeat(501) }), context(bookmarkId));

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(updateBookmarkNote).not.toHaveBeenCalled();
  });

  it("updates the note and returns the bookmark", async () => {
    const response = await PATCH(patchRequest({ note: " Updated note " }), context(bookmarkId));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(bookmark);
    expectNoStore(response);
    expect(updateBookmarkNote).toHaveBeenCalledWith(
      user.id,
      bookmarkId,
      "Updated note"
    );
  });

  it("returns 404 for a missing or foreign bookmark", async () => {
    vi.mocked(updateBookmarkNote).mockResolvedValue(null);

    const response = await PATCH(patchRequest({ note: "Updated note" }), context(bookmarkId));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Bookmark not found." });
    expectNoStore(response);
  });

  it("maps a note-too-long store error to 400", async () => {
    vi.mocked(updateBookmarkNote).mockRejectedValue(
      new BookmarkNoteTooLongError()
    );

    const response = await PATCH(patchRequest({ note: "Updated note" }), context(bookmarkId));

    expect(response.status).toBe(400);
    expectNoStore(response);
  });

  it("returns a safe 500 envelope for unexpected store failures", async () => {
    vi.mocked(updateBookmarkNote).mockRejectedValue(new Error("database down"));

    const response = await PATCH(patchRequest({ note: "Updated note" }), context(bookmarkId));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Unable to update this bookmark.",
    });
    expectNoStore(response);
    expect(console.error).toHaveBeenCalledWith(
      "[bookmarks] note update failed:",
      "database down"
    );
  });
});

describe("DELETE /api/bookmarks/[id]", () => {
  it("returns 401 without an active user", async () => {
    vi.mocked(requireActiveUser).mockResolvedValue(null);

    const response = await DELETE(deleteRequest(), context(bookmarkId));

    expect(response.status).toBe(401);
    expectNoStore(response);
    expect(deleteBookmark).not.toHaveBeenCalled();
  });

  it("rejects an invalid bookmark id", async () => {
    const response = await DELETE(deleteRequest(), context("not-a-uuid"));

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(deleteBookmark).not.toHaveBeenCalled();
  });

  it("deletes the bookmark and returns success", async () => {
    const response = await DELETE(deleteRequest(), context(bookmarkId));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expectNoStore(response);
    expect(deleteBookmark).toHaveBeenCalledWith(user.id, bookmarkId);
  });

  it("returns 404 for a missing or foreign bookmark", async () => {
    vi.mocked(deleteBookmark).mockResolvedValue(false);

    const response = await DELETE(deleteRequest(), context(bookmarkId));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Bookmark not found." });
    expectNoStore(response);
  });

  it("returns a safe 500 envelope for unexpected store failures", async () => {
    vi.mocked(deleteBookmark).mockRejectedValue(new Error("database down"));

    const response = await DELETE(deleteRequest(), context(bookmarkId));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Unable to delete this bookmark.",
    });
    expectNoStore(response);
    expect(console.error).toHaveBeenCalledWith(
      "[bookmarks] delete failed:",
      "database down"
    );
  });
});
