import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/blob", () => ({
  del: vi.fn(),
  head: vi.fn(),
}));

vi.mock("./db", () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
}));

import { listBooks } from "./book-store";
import {
  BookmarkNoteTooLongError,
  BookmarkPageOutOfRangeError,
  BookmarkTargetNotFoundError,
  deleteBookmark,
  listBookmarks,
  saveBookmark,
  setFavorite,
  updateBookmarkNote,
} from "./bookmark-store";
import { query } from "./db";
import { listStories } from "./story-store";

const queryMock = vi.mocked(query);

const bookTargetRow = { total_pages: 12 };
const storyTargetRow = { page_count: "3" };

const bookmarkRow = {
  id: "bookmark-1",
  kind: "book" as const,
  target_id: "book-1",
  title: "The Book",
  page_number: 2,
  note: "Keep reading",
  page_count: 12,
  author: "Author Name",
  cover_color: "#123456",
  cover_image_url: null,
  created_at: "2026-01-02T03:04:05.000Z",
  updated_at: "2026-01-02T03:04:05.000Z",
};

const storyBookmarkRow = {
  ...bookmarkRow,
  id: "bookmark-2",
  kind: "story" as const,
  target_id: "story-1",
  title: "The Story",
  page_number: 1,
  note: null,
  page_count: "3",
  author: null,
  cover_color: null,
  cover_image_url: "https://blob.example/story-cover.png",
};

const expectedBookmark = {
  id: "bookmark-1",
  kind: "book",
  targetId: "book-1",
  title: "The Book",
  pageNumber: 2,
  note: "Keep reading",
  pageCount: 12,
  author: "Author Name",
  coverColor: "#123456",
  coverImageUrl: "",
  createdAt: "2026-01-02T03:04:05.000Z",
  updatedAt: "2026-01-02T03:04:05.000Z",
};

function rows<T>(values: T[], rowCount = values.length) {
  return { rows: values, rowCount } as never;
}

function emptyRows() {
  return rows([]);
}

function callsMatching(fragment: string) {
  return queryMock.mock.calls.filter(([text]) => text.includes(fragment));
}

function mockSaveFlow(row = bookmarkRow) {
  queryMock.mockImplementation(async (text: string) => {
    if (text.startsWith("insert into public.bookmarks")) {
      return rows([{ id: row.id }]);
    }
    if (text.includes("from public.books")) return rows([bookTargetRow]);
    if (text.includes("from public.stories s")) return rows([storyTargetRow]);
    if (text.includes("from public.bookmarks bm")) return rows([row]);
    return emptyRows();
  });
}

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockResolvedValue(emptyRows());
});

describe("saveBookmark", () => {
  it("rejects a book target that is missing or owned by another user", async () => {
    await expect(
      saveBookmark("user-1", { kind: "book", id: "book-9", pageNumber: 1 })
    ).rejects.toBeInstanceOf(BookmarkTargetNotFoundError);

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("where id = $1 and user_id = $2"),
      ["book-9", "user-1"]
    );
    expect(callsMatching("insert into public.bookmarks")).toHaveLength(0);
  });

  it("rejects a story target that is missing or owned by another user", async () => {
    await expect(
      saveBookmark("user-1", { kind: "story", id: "story-9", pageNumber: 1 })
    ).rejects.toBeInstanceOf(BookmarkTargetNotFoundError);

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("from public.stories s"),
      ["story-9", "user-1"]
    );
    expect(callsMatching("insert into public.bookmarks")).toHaveLength(0);
  });

  it.each([
    {
      label: "a PDF page above total_pages",
      kind: "book" as const,
      pageNumber: 13,
      targetRow: bookTargetRow,
    },
    {
      label: "a PDF page below 1",
      kind: "book" as const,
      pageNumber: 0,
      targetRow: bookTargetRow,
    },
    {
      label: "a story page above the page count",
      kind: "story" as const,
      pageNumber: 4,
      targetRow: storyTargetRow,
    },
  ])("rejects $label", async ({ kind, pageNumber, targetRow }) => {
    queryMock.mockResolvedValue(rows([targetRow]));

    await expect(
      saveBookmark("user-1", { kind, id: `${kind}-1`, pageNumber })
    ).rejects.toBeInstanceOf(BookmarkPageOutOfRangeError);

    expect(callsMatching("insert into public.bookmarks")).toHaveLength(0);
  });

  it("allows any positive page when a PDF has no known total_pages", async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.startsWith("insert into public.bookmarks")) {
        return rows([{ id: bookmarkRow.id }]);
      }
      if (text.includes("from public.books")) {
        return rows([{ total_pages: 0 }]);
      }
      if (text.includes("from public.bookmarks bm")) return rows([bookmarkRow]);
      return emptyRows();
    });

    await expect(
      saveBookmark("user-1", { kind: "book", id: "book-1", pageNumber: 500 })
    ).resolves.toEqual(expectedBookmark);
  });

  it("is idempotent for the same user, target, and page", async () => {
    mockSaveFlow();

    const first = await saveBookmark("user-1", {
      kind: "book",
      id: "book-1",
      pageNumber: 2,
    });
    const second = await saveBookmark("user-1", {
      kind: "book",
      id: "book-1",
      pageNumber: 2,
    });

    expect(first).toEqual(expectedBookmark);
    expect(second).toEqual(first);

    const inserts = callsMatching("insert into public.bookmarks");
    expect(inserts).toHaveLength(2);
    expect(inserts[0][0]).toContain(
      "on conflict (user_id, book_id, page_number)"
    );
    expect(inserts[0][0]).toContain("do update set updated_at = now()");
    expect(inserts[0][1]).toEqual(["user-1", "book-1", 2]);
  });
});

describe("listBookmarks", () => {
  it("maps book and story targets with newest-first user scoping", async () => {
    queryMock.mockResolvedValue(rows([bookmarkRow, storyBookmarkRow]));

    const bookmarks = await listBookmarks("user-1");

    expect(bookmarks).toEqual([
      expectedBookmark,
      {
        id: "bookmark-2",
        kind: "story",
        targetId: "story-1",
        title: "The Story",
        pageNumber: 1,
        note: "",
        pageCount: 3,
        author: "",
        coverColor: "#315b45",
        coverImageUrl: "https://blob.example/story-cover.png",
        createdAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-01-02T03:04:05.000Z",
      },
    ]);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("where bm.user_id = $1");
    expect(sql).toContain("order by bm.created_at desc");
    expect(sql).toContain("b.user_id = bm.user_id");
    expect(sql).toContain("s.user_id = bm.user_id");
    expect(params).toEqual(["user-1"]);
  });

  it.each([
    { kind: "book" as const, id: "book-1", column: "bm.book_id = $2" },
    { kind: "story" as const, id: "story-1", column: "bm.story_id = $2" },
  ])("filters bookmarks for one $kind target", async ({ kind, id, column }) => {
    queryMock.mockResolvedValue(rows([bookmarkRow]));

    await listBookmarks("user-1", { kind, id });

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain(column);
    expect(sql).toContain("where bm.user_id = $1");
    expect(params).toEqual(["user-1", id]);
  });
});

describe("updateBookmarkNote", () => {
  it("rejects notes longer than 500 characters without querying", async () => {
    await expect(
      updateBookmarkNote("user-1", "bookmark-1", "x".repeat(501))
    ).rejects.toBeInstanceOf(BookmarkNoteTooLongError);

    expect(queryMock).not.toHaveBeenCalled();
  });

  it("trims and saves a 500-character note scoped by user", async () => {
    const note = "x".repeat(500);
    queryMock.mockImplementation(async (text: string) => {
      if (text.startsWith("update public.bookmarks")) {
        return rows([{ id: "bookmark-1" }]);
      }
      if (text.includes("from public.bookmarks bm")) {
        return rows([{ ...bookmarkRow, note }]);
      }
      return emptyRows();
    });

    const result = await updateBookmarkNote(
      "user-1",
      "bookmark-1",
      `  ${note}  `
    );

    expect(result?.note).toBe(note);
    const [sql, params] = callsMatching("update public.bookmarks")[0];
    expect(sql).toContain("set note = $1, updated_at = now()");
    expect(sql).toContain("where id = $2 and user_id = $3");
    expect(params).toEqual([note, "bookmark-1", "user-1"]);
  });

  it("clears the note when given an empty string", async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.startsWith("update public.bookmarks")) {
        return rows([{ id: "bookmark-1" }]);
      }
      if (text.includes("from public.bookmarks bm")) {
        return rows([{ ...bookmarkRow, note: null }]);
      }
      return emptyRows();
    });

    const result = await updateBookmarkNote("user-1", "bookmark-1", "   ");

    expect(result?.note).toBe("");
    expect(callsMatching("update public.bookmarks")[0][1]).toEqual([
      null,
      "bookmark-1",
      "user-1",
    ]);
  });

  it("returns null when the bookmark is not owned by the user", async () => {
    await expect(
      updateBookmarkNote("user-1", "bookmark-9", "A note")
    ).resolves.toBeNull();

    const [sql, params] = callsMatching("update public.bookmarks")[0];
    expect(sql).toContain("where id = $2 and user_id = $3");
    expect(params).toEqual(["A note", "bookmark-9", "user-1"]);
  });
});

describe("deleteBookmark", () => {
  it("deletes only the user's bookmark", async () => {
    queryMock.mockResolvedValue({ rows: [], rowCount: 1 } as never);

    await expect(deleteBookmark("user-1", "bookmark-1")).resolves.toBe(true);

    expect(queryMock).toHaveBeenCalledWith(
      "delete from public.bookmarks where id = $1 and user_id = $2",
      ["bookmark-1", "user-1"]
    );
  });

  it("returns false when the bookmark is not owned by the user", async () => {
    queryMock.mockResolvedValue({ rows: [], rowCount: 0 } as never);

    await expect(deleteBookmark("user-1", "bookmark-9")).resolves.toBe(false);
  });
});

describe("setFavorite", () => {
  it.each([
    { kind: "book" as const, table: "public.books" },
    { kind: "story" as const, table: "public.stories" },
  ])("scopes $kind favorite updates to the user", async ({ kind, table }) => {
    queryMock.mockResolvedValue({ rows: [], rowCount: 1 } as never);

    await expect(setFavorite("user-1", kind, "target-1", true)).resolves.toBe(
      true
    );

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain(`update ${table}`);
    expect(sql).toContain("set is_favorite = $1, updated_at = now()");
    expect(sql).toContain("where id = $2 and user_id = $3");
    expect(params).toEqual([true, "target-1", "user-1"]);
  });

  it("returns false when no owned row is updated", async () => {
    queryMock.mockResolvedValue({ rows: [], rowCount: 0 } as never);

    await expect(
      setFavorite("user-1", "book", "book-9", false)
    ).resolves.toBe(false);
  });
});

describe("isFavorite mapping", () => {
  it("maps a positive is_favorite value on books and stories", async () => {
    const bookRow = {
      id: "book-1",
      title: "The Book",
      author: "Author Name",
      category: "Fiction",
      description: null,
      file_name: "the-book.pdf",
      file_path: "https://blob.example/the-book.pdf",
      total_pages: 12,
      current_page: 2,
      status: "reading" as const,
      cover_color: "#123456",
      is_favorite: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T03:04:05.000Z",
    };
    const storyRow = {
      id: "story-1",
      title: "The Story",
      story_type: "original" as const,
      source_title: null,
      description: null,
      age_range: null,
      language: "en",
      cover_image_path: null,
      status: "published" as const,
      is_favorite: true,
      page_count: 3,
      current_page: 1,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T03:04:05.000Z",
    };

    queryMock.mockImplementation(async (text: string) => {
      if (text.includes("from public.books")) return rows([bookRow]);
      if (text.includes("from public.stories s")) return rows([storyRow]);
      return emptyRows();
    });

    const [books, stories] = await Promise.all([
      listBooks("user-1"),
      listStories("user-1"),
    ]);

    expect(books[0]?.isFavorite).toBe(true);
    expect(stories[0]?.isFavorite).toBe(true);
  });
});
