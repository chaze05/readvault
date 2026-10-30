const DECIMAL_INTEGER = /^-?\d+$/;

export function parseRequestedPage(value: string | undefined): number | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!DECIMAL_INTEGER.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function clampPage(
  page: number,
  pageCount: number | null | undefined
): number {
  const maxPage =
    typeof pageCount === "number" && pageCount > 0 ? pageCount : null;

  return maxPage === null
    ? Math.max(1, page)
    : Math.min(Math.max(1, page), maxPage);
}
