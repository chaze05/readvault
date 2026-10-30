import { query } from "./db";
import type {
  BookmarkItem,
  BookmarkKind,
  BookmarkTarget,
} from "./types";

export type BookmarkErrorCode =
  | "target_not_found"
  | "page_out_of_range"
  | "note_too_long";

export class BookmarkError extends Error {
  readonly code: BookmarkErrorCode;

  constructor(code: BookmarkErrorCode, message: string) {
    super(message);
    this.name = "BookmarkError";
    this.code = code;
  }
}

export class BookmarkTargetNotFoundError extends BookmarkError {
  constructor() {
    super("target_not_found", "Bookmark target not found.");
    this.name = "BookmarkTargetNotFoundError";
  }
}

export class BookmarkPageOutOfRangeError extends BookmarkError {
  constructor() {
    super("page_out_of_range", "Page number is outside the document.");
    this.name = "BookmarkPageOutOfRangeError";
  }
}

export class BookmarkNoteTooLongError extends BookmarkError {
  constructor() {
    super("note_too_long", "Note must be 500 characters or fewer.");
    this.name = "BookmarkNoteTooLongError";
  }
}

interface BookmarkRow {
  id: string;
  kind: BookmarkKind;
  target_id: string;
  title: string;
  page_number: number | string;
  note: string | null;
  page_count: number | string | null;
  author: string | null;
  cover_color: string | null;
  cover_image_url: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const DEFAULT_COVER_COLOR = "#315b45";
const MAX_NOTE_LENGTH = 500;

const BOOKMARK_SELECT = `
  select bm.id,
    case when bm.book_id is not null then 'book' else 'story' end as kind,
    coalesce(bm.book_id, bm.story_id) as target_id,
    coalesce(b.title, s.title, '') as title,
    bm.page_number,
    bm.note,
    case
      when bm.book_id is not null then b.total_pages
      else (select count(*) from public.story_pages p where p.story_id = s.id)
    end as page_count,
    b.author,
    b.cover_color,
    s.cover_image_path as cover_image_url,
    bm.created_at,
    bm.updated_at
  from public.bookmarks bm
  left join public.books b
    on b.id = bm.book_id and b.user_id = bm.user_id
  left join public.stories s
    on s.id = bm.story_id and s.user_id = bm.user_id
`;

function iso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function toBookmark(row: BookmarkRow): BookmarkItem {
  return {
    id: String(row.id),
    kind: row.kind,
    targetId: String(row.target_id),
    title: row.title,
    pageNumber: Number(row.page_number),
    note: row.note ?? "",
    pageCount: Number(row.page_count ?? 0),
    author: row.author ?? "",
    coverColor: row.cover_color ?? DEFAULT_COVER_COLOR,
    coverImageUrl: row.cover_image_url ?? "",
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function assertPageInRange(pageNumber: number, maxPage: number | null): void {
  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    (maxPage !== null && pageNumber > maxPage)
  ) {
    throw new BookmarkPageOutOfRangeError();
  }
}

async function findBookmark(
  userId: string,
  bookmarkId: string
): Promise<BookmarkItem | null> {
  const { rows } = await query<BookmarkRow>(
    `${BOOKMARK_SELECT}
     where bm.id = $1 and bm.user_id = $2`,
    [bookmarkId, userId]
  );

  return rows[0] ? toBookmark(rows[0]) : null;
}

export async function listBookmarks(
  userId: string,
  target?: { kind: BookmarkKind; id: string }
): Promise<BookmarkItem[]> {
  const conditions = [
    "bm.user_id = $1",
    "(b.id is not null or s.id is not null)",
  ];
  const params: unknown[] = [userId];

  if (target) {
    conditions.push(
      target.kind === "book" ? "bm.book_id = $2" : "bm.story_id = $2"
    );
    params.push(target.id);
  }

  const { rows } = await query<BookmarkRow>(
    `${BOOKMARK_SELECT}
     where ${conditions.join(" and ")}
     order by bm.created_at desc, bm.id desc`,
    params
  );

  return rows.map(toBookmark);
}

export async function saveBookmark(
  userId: string,
  target: BookmarkTarget
): Promise<BookmarkItem> {
  if (target.kind === "book") {
    const { rows } = await query<{ total_pages: number | string }>(
      "select total_pages from public.books where id = $1 and user_id = $2",
      [target.id, userId]
    );

    if (!rows[0]) throw new BookmarkTargetNotFoundError();

    const totalPages = Number(rows[0].total_pages);
    assertPageInRange(
      target.pageNumber,
      totalPages > 0 ? totalPages : null
    );
  } else {
    const { rows } = await query<{ page_count: number | string }>(
      `select (select count(*) from public.story_pages p where p.story_id = s.id) as page_count
       from public.stories s
       where s.id = $1 and s.user_id = $2`,
      [target.id, userId]
    );

    if (!rows[0]) throw new BookmarkTargetNotFoundError();

    assertPageInRange(target.pageNumber, Number(rows[0].page_count));
  }

  const { rows } = await query<{ id: string }>(
    target.kind === "book"
      ? `insert into public.bookmarks (user_id, book_id, page_number)
         values ($1, $2, $3)
         on conflict (user_id, book_id, page_number) where book_id is not null
         do update set updated_at = now()
         returning id`
      : `insert into public.bookmarks (user_id, story_id, page_number)
         values ($1, $2, $3)
         on conflict (user_id, story_id, page_number) where story_id is not null
         do update set updated_at = now()
         returning id`,
    [userId, target.id, target.pageNumber]
  );

  const bookmark = rows[0]
    ? await findBookmark(userId, String(rows[0].id))
    : null;

  if (!bookmark) {
    throw new Error("Bookmark was not found after saving.");
  }

  return bookmark;
}

export async function updateBookmarkNote(
  userId: string,
  bookmarkId: string,
  note: string
): Promise<BookmarkItem | null> {
  const trimmed = note.trim();

  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new BookmarkNoteTooLongError();
  }

  const { rows } = await query<{ id: string }>(
    `update public.bookmarks
     set note = $1, updated_at = now()
     where id = $2 and user_id = $3
     returning id`,
    [trimmed || null, bookmarkId, userId]
  );

  if (!rows[0]) return null;

  return findBookmark(userId, bookmarkId);
}

export async function deleteBookmark(
  userId: string,
  bookmarkId: string
): Promise<boolean> {
  const { rowCount } = await query(
    "delete from public.bookmarks where id = $1 and user_id = $2",
    [bookmarkId, userId]
  );

  return rowCount === 1;
}

export async function setFavorite(
  userId: string,
  kind: BookmarkKind,
  id: string,
  isFavorite: boolean
): Promise<boolean> {
  const table = kind === "book" ? "public.books" : "public.stories";
  const { rowCount } = await query(
    `update ${table}
     set is_favorite = $1, updated_at = now()
     where id = $2 and user_id = $3`,
    [isFavorite, id, userId]
  );

  return rowCount === 1;
}
