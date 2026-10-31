import { describe, expect, it } from "vitest";

import {
  BOOKMARK_STATE_UNAVAILABLE,
  loadReaderBookmarks,
  mergeBookmarksAfterLoad,
} from "./reader-bookmarks";
import type { BookmarkItem } from "./types";

function bookmark(overrides: Partial<BookmarkItem>): BookmarkItem {
  return {
    id: "bookmark-1",
    kind: "book",
    targetId: "11111111-1111-4111-8111-111111111111",
    title: "The Book",
    pageNumber: 1,
    note: "",
    pageCount: 5,
    author: "Author Name",
    coverColor: "#315b45",
    coverImageUrl: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("loadReaderBookmarks", () => {
  it("returns parsed bookmarks for a successful response", async () => {
    const loaded = [bookmark({ id: "loaded", pageNumber: 2 })];

    const result = await loadReaderBookmarks("/api/bookmarks?bookId=x", () =>
      Promise.resolve(
        new Response(JSON.stringify(loaded), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    expect(result).toEqual({ ok: true, bookmarks: loaded });
  });

  it("returns an inline error when the response is not ok", async () => {
    const result = await loadReaderBookmarks("/api/bookmarks?bookId=x", () =>
      Promise.resolve(new Response(null, { status: 500 }))
    );

    expect(result).toEqual({
      ok: false,
      error: BOOKMARK_STATE_UNAVAILABLE,
    });
  });

  it("returns an inline error when the request throws", async () => {
    const result = await loadReaderBookmarks("/api/bookmarks?bookId=x", () =>
      Promise.reject(new Error("offline"))
    );

    expect(result).toEqual({
      ok: false,
      error: BOOKMARK_STATE_UNAVAILABLE,
    });
  });

  it("returns an inline error for a malformed payload", async () => {
    const result = await loadReaderBookmarks("/api/bookmarks?bookId=x", () =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "nope" }), { status: 200 })
      )
    );

    expect(result).toEqual({
      ok: false,
      error: BOOKMARK_STATE_UNAVAILABLE,
    });
  });
});

describe("mergeBookmarksAfterLoad", () => {
  it("uses the loaded list when nothing changed locally", () => {
    const loaded = [bookmark({ id: "loaded", pageNumber: 2 })];
    const current = [bookmark({ id: "current", pageNumber: 4 })];

    expect(mergeBookmarksAfterLoad(loaded, current, new Set())).toEqual(loaded);
  });

  it("keeps a just-saved bookmark when a slow GET resolves later", () => {
    const saved = bookmark({ id: "saved", pageNumber: 5 });
    const loaded = [bookmark({ id: "loaded", pageNumber: 2 })];

    expect(mergeBookmarksAfterLoad(loaded, [saved], new Set([5]))).toEqual([
      saved,
      loaded[0],
    ]);
  });

  it("does not resurrect a locally removed bookmark", () => {
    const removed = bookmark({ id: "removed", pageNumber: 3 });

    expect(mergeBookmarksAfterLoad([removed], [], new Set([3]))).toEqual([]);
  });
});
