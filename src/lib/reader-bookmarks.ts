import type { BookmarkItem } from "./types";

export const BOOKMARK_STATE_UNAVAILABLE = "Bookmark state unavailable";

type BookmarksFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export type ReaderBookmarksResult =
  | { ok: true; bookmarks: BookmarkItem[] }
  | { ok: false; error: string };

export async function loadReaderBookmarks(
  url: string,
  fetchImpl: BookmarksFetch = fetch
): Promise<ReaderBookmarksResult> {
  try {
    const response = await fetchImpl(url, { cache: "no-store" });
    if (!response.ok) {
      return { ok: false, error: BOOKMARK_STATE_UNAVAILABLE };
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
      return { ok: false, error: BOOKMARK_STATE_UNAVAILABLE };
    }

    return { ok: true, bookmarks: data as BookmarkItem[] };
  } catch {
    return { ok: false, error: BOOKMARK_STATE_UNAVAILABLE };
  }
}

export function mergeBookmarksAfterLoad(
  loaded: BookmarkItem[],
  current: BookmarkItem[],
  changedPages: Iterable<number>
): BookmarkItem[] {
  const changed = new Set(changedPages);
  if (changed.size === 0) return loaded;

  const local = current.filter((item) => changed.has(item.pageNumber));
  const localIds = new Set(local.map((item) => item.id));

  return [
    ...local,
    ...loaded.filter(
      (item) => !changed.has(item.pageNumber) && !localIds.has(item.id)
    ),
  ];
}
