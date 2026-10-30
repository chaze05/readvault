import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(path.join(dataDir, "uploads"), { recursive: true });

const dbPath = path.join(dataDir, "readvault.db");
const globalForDb = globalThis as unknown as { readvaultDb?: Database.Database };

function createDatabase() {
  const database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");

  database.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'Unknown author',
      category TEXT NOT NULL DEFAULT 'Uncategorized',
      description TEXT,
      file_name TEXT,
      file_path TEXT,
      total_pages INTEGER NOT NULL DEFAULT 0,
      current_page INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'not_started',
      cover_color TEXT NOT NULL DEFAULT '#315b45',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return database;
}

export function getDb(): Database.Database {
  if (!globalForDb.readvaultDb) {
    globalForDb.readvaultDb = createDatabase();
  }

  return globalForDb.readvaultDb;
}

export function rowToBook(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    title: String(row.title),
    author: String(row.author),
    category: String(row.category),
    description: row.description ? String(row.description) : null,
    fileName: row.file_name ? String(row.file_name) : null,
    hasFile: Boolean(row.file_path),
    totalPages: Number(row.total_pages),
    currentPage: Number(row.current_page),
    status: String(row.status) as "not_started" | "reading" | "completed",
    coverColor: String(row.cover_color),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}
