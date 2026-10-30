import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/current-user", () => ({
  requireActiveUser: vi.fn(),
}));

vi.mock("@/lib/bookmark-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bookmark-store")>();
  return {
    ...actual,
    listBookmarks: vi.fn(),
    saveBookmark: vi.fn(),
  };
});

import { NextRequest } from "next/server";

import {
  BookmarkNoteTooLongError,
  BookmarkPageOutOfRangeError,
  BookmarkTargetNotFoundError,
  listBookmarks,
  saveBookmark,
} from "@/lib/bookmark-store";
import { requireActiveUser } from "@/lib/current-user";
import type { BookmarkItem } from "@/lib/types";

import { GET, POST } from "./route";

const bookId = "11111111-1111-4111-8111-111111111111";
const storyId = "22222222-2222-4222-8222-222222222222";

const user = {
  id: "db-user-1",
  email: "user@example.com",
  isAdmin: false,
  mustChangePassword: false,
  sessionVersion: 0,
};

const bookmark: BookmarkItem = {
  id: "33333333-3333-4333-8333-333333333333",
  kind: "book",
  targetId: bookId,
  title: "The Book",
  pageNumber: 3,
  note: "",
  pageCount: 5,
  author: "Author Name",
  coverColor: "#315b45",
  coverImageUrl: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function getRequest(path = "/api/bookmarks"): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
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
  vi.mocked(listBookmarks).mockResolvedValue([]);
  vi.mocked(saveBookmark).mockResolvedValue(bookmark);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/bookmarks", () => {
  it("returns 401 without an active user", async () => {
    vi.mocked(requireActiveUser).mockResolvedValue(null);

    const response = await GET(getRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expectNoStore(response);
    expect(listBookmarks).not.toHaveBeenCalled();
  });

  it("returns the user's bookmarks with no-store headers", async () => {
    vi.mocked(listBookmarks).mockResolvedValue([bookmark]);

    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([bookmark]);
    expectNoStore(response);
    expect(listBookmarks).toHaveBeenCalledWith(user.id, undefined);
  });

  it.each([
    { query: `?bookId=${bookId}`, target: { kind: "book", id: bookId } },
    { query: `?storyId=${storyId}`, target: { kind: "story", id: storyId } },
  ])("passes the $target.kind filter to the store", async ({ query, target }) => {
    const response = await GET(getRequest(`/api/bookmarks${query}`));

    expect(response.status).toBe(200);
    expect(listBookmarks).toHaveBeenCalledWith(user.id, target);
  });

  it("returns 200 [] for a foreign target filter without disclosing it", async () => {
    const response = await GET(
      getRequest(`/api/bookmarks?bookId=${bookId}`)
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(listBookmarks).toHaveBeenCalledWith(user.id, {
      kind: "book",
      id: bookId,
    });
  });

  it("rejects both filters together", async () => {
    const response = await GET(
      getRequest(`/api/bookmarks?bookId=${bookId}&storyId=${storyId}`)
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Choose either bookId or storyId, not both.",
    });
    expectNoStore(response);
    expect(listBookmarks).not.toHaveBeenCalled();
  });

  it.each([
    "/api/bookmarks?bookId=not-a-uuid",
    "/api/bookmarks?storyId=not-a-uuid",
  ])("rejects invalid filter %s", async (path) => {
    const response = await GET(getRequest(path));

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(listBookmarks).not.toHaveBeenCalled();
  });

  it("returns a safe 500 envelope when the store fails", async () => {
    vi.mocked(listBookmarks).mockRejectedValue(new Error("database down"));

    const response = await GET(getRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Unable to load bookmarks.",
    });
    expectNoStore(response);
    expect(console.error).toHaveBeenCalledWith(
      "[bookmarks] list failed:",
      "database down"
    );
  });
});

describe("POST /api/bookmarks", () => {
  it("returns 401 without an active user", async () => {
    vi.mocked(requireActiveUser).mockResolvedValue(null);

    const response = await POST(postRequest({ bookId, pageNumber: 3 }));

    expect(response.status).toBe(401);
    expectNoStore(response);
    expect(saveBookmark).not.toHaveBeenCalled();
  });

  it("saves a book bookmark and returns the item", async () => {
    const response = await POST(postRequest({ bookId, pageNumber: 3 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(bookmark);
    expectNoStore(response);
    expect(saveBookmark).toHaveBeenCalledWith(user.id, {
      kind: "book",
      id: bookId,
      pageNumber: 3,
    });
  });

  it("saves a story bookmark and returns the item", async () => {
    const response = await POST(postRequest({ storyId, pageNumber: 1 }));

    expect(response.status).toBe(200);
    expectNoStore(response);
    expect(saveBookmark).toHaveBeenCalledWith(user.id, {
      kind: "story",
      id: storyId,
      pageNumber: 1,
    });
  });

  it.each([
    { label: "malformed JSON", body: "{" },
    { label: "both targets", body: { bookId, storyId, pageNumber: 1 } },
    { label: "no target", body: { pageNumber: 1 } },
    { label: "invalid uuid", body: { bookId: "not-a-uuid", pageNumber: 1 } },
    { label: "page zero", body: { bookId, pageNumber: 0 } },
  ])("rejects $label with 400", async ({ body }) => {
    const response = await POST(postRequest(body));

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(saveBookmark).not.toHaveBeenCalled();
  });

  it("maps a missing or foreign target to 404", async () => {
    vi.mocked(saveBookmark).mockRejectedValue(
      new BookmarkTargetNotFoundError()
    );

    const response = await POST(postRequest({ bookId, pageNumber: 1 }));

    expect(response.status).toBe(404);
    expectNoStore(response);
  });

  it.each([
    new BookmarkPageOutOfRangeError(),
    new BookmarkNoteTooLongError(),
  ])("maps %s to 400", async (error) => {
    vi.mocked(saveBookmark).mockRejectedValue(error);

    const response = await POST(postRequest({ bookId, pageNumber: 1 }));

    expect(response.status).toBe(400);
    expectNoStore(response);
  });

  it("returns a safe 500 envelope for unexpected store failures", async () => {
    vi.mocked(saveBookmark).mockRejectedValue(new Error("database down"));

    const response = await POST(postRequest({ bookId, pageNumber: 1 }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Unable to save this bookmark.",
    });
    expectNoStore(response);
    expect(console.error).toHaveBeenCalledWith(
      "[bookmarks] save failed:",
      "database down"
    );
  });
});
