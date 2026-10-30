import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getDb, rowToBook } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const colors = ["#344d43", "#3f6681", "#8b6347", "#655b83", "#47736e", "#6f7650"];

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM books ORDER BY updated_at DESC, id DESC").all() as Record<string, unknown>[];
  return NextResponse.json(rows.map(rowToBook));
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") || "").trim();
    const author = String(form.get("author") || "Unknown author").trim();
    const category = String(form.get("category") || "Uncategorized").trim();

    if (!title) return NextResponse.json({ error: "Book title is required." }, { status: 400 });
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Please select a PDF file." }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) return NextResponse.json({ error: "PDF must be 50 MB or smaller." }, { status: 400 });

    const uploadDir = path.join(process.cwd(), "data", "uploads");
    fs.mkdirSync(uploadDir, { recursive: true });
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.pdf`;
    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));

    const result = db.prepare(`
      INSERT INTO books (title, author, category, file_name, file_path, status, cover_color)
      VALUES (?, ?, ?, ?, ?, 'not_started', ?)
    `).run(title, author || "Unknown author", category || "Uncategorized", file.name, filePath,
      colors[Math.floor(Math.random() * colors.length)]);

    const row = db.prepare("SELECT * FROM books WHERE id = ?").get(result.lastInsertRowid) as Record<string, unknown>;
    return NextResponse.json(rowToBook(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to upload this PDF." }, { status: 500 });
  }
}
