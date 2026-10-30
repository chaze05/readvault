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

  const count = database.prepare("SELECT COUNT(*) as count FROM books").get() as { count: number };
  if (count.count === 0) {
    const seed = database.prepare(`
      INSERT INTO books (title, author, category, description, total_pages, current_page, status, cover_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const samples = [
      ["The Art of War", "Sun Tzu", "Strategy", "The classic treatise on strategy and leadership.", 120, 18, "reading", "#344d43"],
      ["Think Python", "Allen B. Downey", "Programming", "A practical introduction to software development using Python.", 292, 0, "not_started", "#3f6681"],
      ["Think Stats", "Allen B. Downey", "Data Science", "Probability and statistics for programmers.", 220, 0, "not_started", "#8b6347"],
      ["Mathematics for Computer Science", "Eric Lehman, F. Thomson Leighton & Albert R. Meyer", "Mathematics", "Discrete mathematics foundations for computer science.", 600, 0, "not_started", "#655b83"],
      ["Dive into Deep Learning", "Aston Zhang et al.", "Artificial Intelligence", "An interactive book on deep learning.", 700, 0, "not_started", "#47736e"]
    ] as const;
    for (const item of samples) seed.run(...item);
  }

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
