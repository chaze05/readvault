import { del, head, list, put } from "@vercel/blob";

import { DuplicateBookError } from "./book-errors";
import type { Book, BookStatus } from "./types";

const BOOKS_PATH = "readvault/books.json";
const COVER_COLORS = [
  "#344d43",
  "#3f6681",
  "#8b6347",
  "#655b83",
  "#47736e",
  "#6f7650",
];

interface CloudBookRecord {
  id: number;
  title: string;
  author: string;
  category: string;
  description: string | null;
  fileName: string;
  fileUrl: string;
  fileHash: string;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  coverColor: string;
  createdAt: string;
  updatedAt: string;
}

interface CloudIndex {
  books: CloudBookRecord[];
}

export interface CreateCloudBookInput {
  title: string;
  author: string;
  category: string;
  fileName: string;
  fileUrl: string;
  fileHash: string;
}

function toBook(record: CloudBookRecord): Book {
  return {
    id: record.id,
    title: record.title,
    author: record.author,
    category: record.category,
    description: record.description,
    fileName: record.fileName,
    hasFile: true,
    fileUrl: record.fileUrl,
    totalPages: record.totalPages,
    currentPage: record.currentPage,
    status: record.status,
    coverColor: record.coverColor,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function getIndex(): Promise<CloudIndex> {
  const { blobs } = await list({ prefix: BOOKS_PATH, limit: 1 });
  const indexBlob = blobs.find((blob) => blob.pathname === BOOKS_PATH);

  if (!indexBlob) {
    return { books: [] };
  }

  const response = await fetch(indexBlob.url, { cache: "no-store" });
  if (!response.ok) {
    return { books: [] };
  }

  const data = (await response.json()) as Partial<CloudIndex>;
  return { books: Array.isArray(data.books) ? data.books : [] };
}

async function saveIndex(index: CloudIndex): Promise<void> {
  await put(BOOKS_PATH, JSON.stringify(index), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

export async function listCloudBooks(): Promise<Book[]> {
  const index = await getIndex();
  return index.books
    .map(toBook)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getCloudBook(id: number): Promise<Book | null> {
  const index = await getIndex();
  const record = index.books.find((book) => book.id === id);
  return record ? toBook(record) : null;
}

export async function createCloudBook(
  input: CreateCloudBookInput
): Promise<Book> {
  const index = await getIndex();
  const duplicate = index.books.find(
    (book) => book.fileHash === input.fileHash
  );

  if (duplicate) {
    throw new DuplicateBookError(duplicate.id);
  }

  const blob = await head(input.fileUrl);
  if (
    blob.contentType !== "application/pdf" &&
    !blob.pathname.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("The uploaded file is not a PDF.");
  }

  const now = new Date().toISOString();
  const record: CloudBookRecord = {
    id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
    title: input.title,
    author: input.author,
    category: input.category,
    description: null,
    fileName: input.fileName,
    fileUrl: input.fileUrl,
    fileHash: input.fileHash,
    totalPages: 0,
    currentPage: 0,
    status: "not_started",
    coverColor:
      COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)],
    createdAt: now,
    updatedAt: now,
  };

  index.books.push(record);

  try {
    await saveIndex(index);
  } catch (error) {
    await del(input.fileUrl).catch(() => {});
    throw error;
  }

  return toBook(record);
}

export async function updateCloudBook(
  id: number,
  input: { title: string; author: string; category: string }
): Promise<Book | null> {
  const index = await getIndex();
  const record = index.books.find((book) => book.id === id);

  if (!record) return null;

  record.title = input.title;
  record.author = input.author;
  record.category = input.category;
  record.updatedAt = new Date().toISOString();
  await saveIndex(index);

  return toBook(record);
}

export async function deleteCloudBook(id: number): Promise<boolean> {
  const index = await getIndex();
  const record = index.books.find((book) => book.id === id);

  if (!record) return false;

  index.books = index.books.filter((book) => book.id !== id);
  await saveIndex(index);
  await del(record.fileUrl).catch(() => {});

  return true;
}

export async function saveCloudProgress(
  id: number,
  currentPage: number,
  totalPages?: number
): Promise<{
  currentPage: number;
  totalPages: number;
  status: BookStatus;
} | null> {
  const index = await getIndex();
  const record = index.books.find((book) => book.id === id);

  if (!record) return null;

  const effectiveTotal = totalPages ?? record.totalPages;
  const page =
    effectiveTotal > 0 ? Math.min(currentPage, effectiveTotal) : currentPage;
  const status: BookStatus =
    effectiveTotal > 0 && page >= effectiveTotal
      ? "completed"
      : page > 0
        ? "reading"
        : "not_started";

  record.currentPage = page;
  record.totalPages = effectiveTotal;
  record.status = status;
  record.updatedAt = new Date().toISOString();
  await saveIndex(index);

  return { currentPage: page, totalPages: effectiveTotal, status };
}

export async function getCloudFile(
  id: number
): Promise<{ buffer: Buffer; fileName: string } | null> {
  const index = await getIndex();
  const record = index.books.find((book) => book.id === id);

  if (!record) return null;

  const response = await fetch(record.fileUrl, { cache: "no-store" });
  if (!response.ok) return null;

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    fileName: record.fileName,
  };
}

export async function cleanupCloudBlob(fileUrl: string): Promise<void> {
  await del(fileUrl).catch(() => {});
}
