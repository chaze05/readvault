import { del, get, head, list, put } from "@vercel/blob";

import { DuplicateBookError } from "./book-errors";
import type { Book, BookStatus } from "./types";

const BOOKS_PREFIX = "readvault/books/";
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

export interface CreateCloudBookInput {
  title: string;
  author: string;
  category: string;
  fileName: string;
  fileUrl: string;
  fileHash: string;
}

function metadataPath(id: number): string {
  return `${BOOKS_PREFIX}${id}.json`;
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

async function readRecord(pathname: string): Promise<CloudBookRecord | null> {
  try {
    const blob = await get(pathname, { access: "public", useCache: false });
    if (!blob || blob.statusCode !== 200) return null;
    return (await new Response(blob.stream).json()) as CloudBookRecord;
  } catch {
    return null;
  }
}

async function writeRecord(record: CloudBookRecord): Promise<void> {
  await put(metadataPath(record.id), JSON.stringify(record), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

async function listRecords(): Promise<CloudBookRecord[]> {
  const { blobs } = await list({ prefix: BOOKS_PREFIX, limit: 1000 });
  const records = await Promise.all(
    blobs.map((blob) => readRecord(blob.pathname))
  );

  return records.filter((record): record is CloudBookRecord => Boolean(record));
}

export async function listCloudBooks(): Promise<Book[]> {
  const records = await listRecords();
  return records
    .map(toBook)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getCloudBook(id: number): Promise<Book | null> {
  const record = await readRecord(metadataPath(id));
  return record ? toBook(record) : null;
}

export async function createCloudBook(
  input: CreateCloudBookInput
): Promise<Book> {
  const records = await listRecords();
  const duplicate = records.find(
    (record) => record.fileHash === input.fileHash
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

  try {
    await writeRecord(record);
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
  const record = await readRecord(metadataPath(id));
  if (!record) return null;

  record.title = input.title;
  record.author = input.author;
  record.category = input.category;
  record.updatedAt = new Date().toISOString();
  await writeRecord(record);

  return toBook(record);
}

export async function deleteCloudBook(id: number): Promise<boolean> {
  const record = await readRecord(metadataPath(id));
  if (!record) return false;

  await del(metadataPath(id));
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
  const record = await readRecord(metadataPath(id));
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
  await writeRecord(record);

  return { currentPage: page, totalPages: effectiveTotal, status };
}

export async function getCloudFile(
  id: number
): Promise<{ buffer: Buffer; fileName: string } | null> {
  const record = await readRecord(metadataPath(id));
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
