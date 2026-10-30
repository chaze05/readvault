import fs from "node:fs";

import { DuplicateBookError } from "./book-errors";
import { deletePdf, isInsideUploads, savePdf } from "./storage";
import { isCloudMode } from "./storage-mode";
import type { Book, BookStatus } from "./types";

const COVER_COLORS = [
  "#344d43",
  "#3f6681",
  "#8b6347",
  "#655b83",
  "#47736e",
  "#6f7650",
];

export interface CreateBookInput {
  title: string;
  author: string;
  category: string;
  fileName: string;
  fileHash: string;
  buffer?: Buffer;
  fileUrl?: string;
}

export async function listBooks(): Promise<Book[]> {
  if (isCloudMode()) {
    const { listCloudBooks } = await import("./cloud-store");
    return listCloudBooks();
  }

  const { getDb, rowToBook } = await import("./db");
  const rows = getDb()
    .prepare("SELECT * FROM books ORDER BY updated_at DESC, id DESC")
    .all() as Record<string, unknown>[];

  return rows.map((row) => rowToBook(row) as Book);
}

export async function getBook(id: number): Promise<Book | null> {
  if (isCloudMode()) {
    const { getCloudBook } = await import("./cloud-store");
    return getCloudBook(id);
  }

  const { getDb, rowToBook } = await import("./db");
  const row = getDb()
    .prepare("SELECT * FROM books WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;

  return row ? (rowToBook(row) as Book) : null;
}

export async function createBook(input: CreateBookInput): Promise<Book> {
  if (isCloudMode()) {
    if (!input.fileUrl) {
      throw new Error("A Blob file URL is required in cloud mode.");
    }

    const { createCloudBook } = await import("./cloud-store");
    return createCloudBook({
      title: input.title,
      author: input.author,
      category: input.category,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      fileHash: input.fileHash,
    });
  }

  if (!input.buffer) {
    throw new Error("A file buffer is required in local mode.");
  }

  const { getDb, rowToBook } = await import("./db");
  const db = getDb();
  const duplicate = db
    .prepare("SELECT id FROM books WHERE file_hash = ?")
    .get(input.fileHash) as { id: number } | undefined;

  if (duplicate) {
    throw new DuplicateBookError(Number(duplicate.id));
  }

  const stored = savePdf(input.buffer);

  try {
    const result = db
      .prepare(
        `INSERT INTO books
           (title, author, category, file_name, file_path, file_hash, status, cover_color)
         VALUES (?, ?, ?, ?, ?, ?, 'not_started', ?)`
      )
      .run(
        input.title,
        input.author,
        input.category,
        input.fileName,
        stored.filePath,
        input.fileHash,
        COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)]
      );

    const row = db
      .prepare("SELECT * FROM books WHERE id = ?")
      .get(result.lastInsertRowid) as Record<string, unknown>;

    return rowToBook(row) as Book;
  } catch (error) {
    deletePdf(stored.filePath);
    throw error;
  }
}

export async function updateBook(
  id: number,
  input: { title: string; author: string; category: string }
): Promise<Book | null> {
  if (isCloudMode()) {
    const { updateCloudBook } = await import("./cloud-store");
    return updateCloudBook(id, input);
  }

  const { getDb, rowToBook } = await import("./db");
  const db = getDb();
  const result = db
    .prepare(
      `UPDATE books
       SET title = ?, author = ?, category = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(input.title, input.author, input.category, id);

  if (result.changes === 0) return null;

  const row = db
    .prepare("SELECT * FROM books WHERE id = ?")
    .get(id) as Record<string, unknown>;

  return rowToBook(row) as Book;
}

export async function deleteBook(id: number): Promise<boolean> {
  if (isCloudMode()) {
    const { deleteCloudBook } = await import("./cloud-store");
    return deleteCloudBook(id);
  }

  const { getDb } = await import("./db");
  const db = getDb();
  const row = db
    .prepare("SELECT file_path FROM books WHERE id = ?")
    .get(id) as { file_path?: string } | undefined;

  if (!row) return false;

  db.prepare("DELETE FROM books WHERE id = ?").run(id);

  if (row.file_path) {
    deletePdf(row.file_path);
  }

  return true;
}

export async function saveProgress(
  id: number,
  currentPage: number,
  totalPages?: number
): Promise<{
  currentPage: number;
  totalPages: number;
  status: BookStatus;
} | null> {
  if (isCloudMode()) {
    const { saveCloudProgress } = await import("./cloud-store");
    return saveCloudProgress(id, currentPage, totalPages);
  }

  const { getDb } = await import("./db");
  const db = getDb();
  const row = db
    .prepare("SELECT id, total_pages FROM books WHERE id = ?")
    .get(id) as { id: number; total_pages: number } | undefined;

  if (!row) return null;

  const effectiveTotal = totalPages ?? row.total_pages;
  const page =
    effectiveTotal > 0 ? Math.min(currentPage, effectiveTotal) : currentPage;
  const status: BookStatus =
    effectiveTotal > 0 && page >= effectiveTotal
      ? "completed"
      : page > 0
        ? "reading"
        : "not_started";

  db.prepare(
    `UPDATE books
     SET current_page = ?, total_pages = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(page, effectiveTotal, status, id);

  return { currentPage: page, totalPages: effectiveTotal, status };
}

export async function getBookFile(
  id: number
): Promise<{ buffer: Buffer; fileName: string } | null> {
  if (isCloudMode()) {
    const { getCloudFile } = await import("./cloud-store");
    return getCloudFile(id);
  }

  const { getDb } = await import("./db");
  const row = getDb()
    .prepare("SELECT file_path, file_name FROM books WHERE id = ?")
    .get(id) as { file_path?: string; file_name?: string } | undefined;

  if (
    !row?.file_path ||
    !isInsideUploads(row.file_path) ||
    !fs.existsSync(row.file_path)
  ) {
    return null;
  }

  return {
    buffer: fs.readFileSync(row.file_path),
    fileName: row.file_name || "document.pdf",
  };
}
