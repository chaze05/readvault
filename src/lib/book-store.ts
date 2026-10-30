import { del, head } from "@vercel/blob";

import {
  assertBlobPathnameClaimedByUser,
  isBlobUrlClaimedByUser,
} from "./blob-claims";
import { DuplicateBookError } from "./book-errors";
import { query } from "./db";
import type { Book, BookStatus } from "./types";

interface BookRow {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string | null;
  file_name: string;
  file_path: string;
  total_pages: number;
  current_page: number;
  status: BookStatus;
  cover_color: string;
  is_favorite: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateBookInput {
  title: string;
  author: string;
  category: string;
  fileName: string;
  fileHash: string;
  fileUrl: string;
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toBook(row: BookRow): Book {
  return {
    id: String(row.id),
    title: row.title,
    author: row.author,
    category: row.category,
    description: row.description,
    fileName: row.file_name,
    hasFile: Boolean(row.file_path),
    fileUrl: row.file_path,
    totalPages: Number(row.total_pages),
    currentPage: Number(row.current_page),
    status: row.status,
    coverColor: row.cover_color,
    isFavorite: Boolean(row.is_favorite),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function listBooks(userId: string): Promise<Book[]> {
  const { rows } = await query<BookRow>(
    `select * from public.books
     where user_id = $1
     order by updated_at desc, id desc`,
    [userId]
  );

  return rows.map(toBook);
}

export async function getBook(
  userId: string,
  id: string
): Promise<Book | null> {
  const { rows } = await query<BookRow>(
    "select * from public.books where id = $1 and user_id = $2",
    [id, userId]
  );

  return rows[0] ? toBook(rows[0]) : null;
}

export async function createBook(
  userId: string,
  input: CreateBookInput
): Promise<Book> {
  const duplicate = await query<{ id: string }>(
    "select id from public.books where user_id = $1 and file_hash = $2",
    [userId, input.fileHash]
  );

  if (duplicate.rows[0]) {
    throw new DuplicateBookError(duplicate.rows[0].id);
  }

  const blob = await head(input.fileUrl);
  if (
    blob.contentType !== "application/pdf" &&
    !blob.pathname.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("The uploaded file is not a PDF.");
  }

  await assertBlobPathnameClaimedByUser(userId, blob.pathname);

  try {
    const { rows } = await query<BookRow>(
      `insert into public.books
         (user_id, title, author, category, file_name, file_path, file_hash)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        userId,
        input.title,
        input.author,
        input.category,
        input.fileName,
        input.fileUrl,
        input.fileHash,
      ]
    );

    return toBook(rows[0]);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "23505"
    ) {
      const existing = await query<{ id: string }>(
        "select id from public.books where user_id = $1 and file_hash = $2",
        [userId, input.fileHash]
      );
      if (existing.rows[0]) {
        throw new DuplicateBookError(existing.rows[0].id);
      }
    }
    throw error;
  }
}

export async function updateBook(
  userId: string,
  id: string,
  input: { title: string; author: string; category: string }
): Promise<Book | null> {
  const { rows } = await query<BookRow>(
    `update public.books
     set title = $1, author = $2, category = $3, updated_at = now()
     where id = $4 and user_id = $5
     returning *`,
    [input.title, input.author, input.category, id, userId]
  );

  return rows[0] ? toBook(rows[0]) : null;
}

export async function deleteBook(
  userId: string,
  id: string
): Promise<boolean> {
  const { rows } = await query<{ file_path: string }>(
    "select file_path from public.books where id = $1 and user_id = $2",
    [id, userId]
  );

  if (!rows[0]) return false;

  const ownsBlob = await isBlobUrlClaimedByUser(userId, rows[0].file_path);

  await query("delete from public.books where id = $1 and user_id = $2", [
    id,
    userId,
  ]);
  if (ownsBlob) await del(rows[0].file_path).catch(() => {});

  return true;
}

export async function saveProgress(
  userId: string,
  id: string,
  currentPage: number,
  totalPages?: number
): Promise<{
  currentPage: number;
  totalPages: number;
  status: BookStatus;
} | null> {
  const existing = await query<{ total_pages: number }>(
    "select total_pages from public.books where id = $1 and user_id = $2",
    [id, userId]
  );

  if (!existing.rows[0]) return null;

  const effectiveTotal = totalPages ?? Number(existing.rows[0].total_pages);
  const page =
    effectiveTotal > 0 ? Math.min(currentPage, effectiveTotal) : currentPage;
  const status: BookStatus =
    effectiveTotal > 0 && page >= effectiveTotal
      ? "completed"
      : page > 0
        ? "reading"
        : "not_started";

  await query(
    `update public.books
     set current_page = $1, total_pages = $2, status = $3, updated_at = now()
     where id = $4 and user_id = $5`,
    [page, effectiveTotal, status, id, userId]
  );

  return { currentPage: page, totalPages: effectiveTotal, status };
}

export async function getBookFile(
  userId: string,
  id: string
): Promise<{ fileUrl: string; fileName: string } | null> {
  const { rows } = await query<{ file_path: string; file_name: string }>(
    "select file_path, file_name from public.books where id = $1 and user_id = $2",
    [id, userId]
  );

  if (!rows[0]) return null;
  return { fileUrl: rows[0].file_path, fileName: rows[0].file_name };
}
