import { query } from "./db";

const CLAIM_CONFLICT_ERROR = "This upload path is already in use.";
const CLAIM_MISSING_ERROR = "This file is not owned by your account.";
const CLAIM_VERIFY_ERROR =
  "Could not verify ownership of one or more stored files.";

export class BlobClaimError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlobClaimError";
  }
}

export function normalizeBlobPathname(
  value: string | null | undefined
): string | null {
  if (typeof value !== "string") return null;

  let pathname = value.trim();
  if (!pathname) return null;

  if (/^https?:\/\//i.test(pathname)) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return null;
    }
  }

  pathname = pathname.split("?")[0].split("#")[0].replace(/^\/+/, "");

  if (!pathname || pathname.includes("..") || pathname.includes("\\")) {
    return null;
  }

  return pathname;
}

export async function claimBlobPathname(
  userId: string,
  pathname: string
): Promise<string> {
  const normalized = normalizeBlobPathname(pathname);
  if (!normalized) {
    throw new BlobClaimError("Invalid upload path.");
  }

  const inserted = await query<{ id: string }>(
    `insert into public.blob_claims (user_id, pathname)
     values ($1, $2)
     on conflict (pathname) do nothing
     returning id`,
    [userId, normalized]
  );

  if (inserted.rows[0]) {
    return normalized;
  }

  const existing = await query<{ user_id: string }>(
    "select user_id from public.blob_claims where pathname = $1",
    [normalized]
  );

  if (existing.rows[0]?.user_id !== userId) {
    throw new BlobClaimError(CLAIM_CONFLICT_ERROR);
  }

  return normalized;
}

export async function isBlobPathnameClaimedByUser(
  userId: string,
  pathname: string
): Promise<boolean> {
  const normalized = normalizeBlobPathname(pathname);
  if (!normalized) return false;

  const { rows } = await query<{ pathname: string }>(
    `select pathname from public.blob_claims
     where user_id = $1 and pathname = $2`,
    [userId, normalized]
  );

  return rows.length > 0;
}

export async function isBlobUrlClaimedByUser(
  userId: string,
  url: string
): Promise<boolean> {
  const pathname = normalizeBlobPathname(url);
  return pathname ? isBlobPathnameClaimedByUser(userId, pathname) : false;
}

export async function assertBlobPathnameClaimedByUser(
  userId: string,
  pathname: string
): Promise<void> {
  if (!(await isBlobPathnameClaimedByUser(userId, pathname))) {
    throw new BlobClaimError(CLAIM_MISSING_ERROR);
  }
}

export async function assertBlobUrlsClaimedByUser(
  userId: string,
  blobUrls: string[]
): Promise<void> {
  const urls = [...new Set(blobUrls)];
  if (urls.length === 0) return;

  const pathnames: string[] = [];
  for (const url of urls) {
    const pathname = normalizeBlobPathname(url);
    if (!pathname) {
      throw new BlobClaimError(CLAIM_VERIFY_ERROR);
    }
    pathnames.push(pathname);
  }

  const { rows } = await query<{ pathname: string }>(
    `select pathname from public.blob_claims
     where user_id = $1 and pathname = any($2::text[])`,
    [userId, pathnames]
  );
  const claimed = new Set(rows.map((row) => row.pathname));

  if (pathnames.some((pathname) => !claimed.has(pathname))) {
    throw new BlobClaimError(CLAIM_VERIFY_ERROR);
  }
}
