import { NextRequest, NextResponse } from "next/server";

import { getDb, rowToBook } from "@/lib/db";
import { sha256 } from "@/lib/hash";
import { deletePdf, savePdf } from "@/lib/storage";
import { hasPdfSignature, parseBookInput } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const colors = ["#344d43", "#3f6681", "#8b6347", "#655b83", "#47736e", "#6f7650"];
const MAX_BYTES = 50 * 1024 * 1024;

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM books ORDER BY updated_at DESC, id DESC")
    .all() as Record<string, unknown>[];

  return NextResponse.json(rows.map(rowToBook));
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const form = await request.formData();
    const parsed = parseBookInput(form);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Please select a PDF file." },
        { status: 400 }
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Only PDF files are supported." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "PDF must be 50 MB or smaller." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasPdfSignature(buffer)) {
      return NextResponse.json(
        { error: "This file does not look like a valid PDF." },
        { status: 400 }
      );
    }

    const fileHash = sha256(buffer);
    const duplicate = db
      .prepare("SELECT id FROM books WHERE file_hash = ?")
      .get(fileHash) as { id: number } | undefined;

    if (duplicate) {
      return NextResponse.json(
        {
          error: "This PDF is already in your library.",
          bookId: duplicate.id,
        },
        { status: 409 }
      );
    }

    const stored = savePdf(buffer);

    try {
      const result = db
        .prepare(
          `INSERT INTO books
             (title, author, category, file_name, file_path, file_hash, status, cover_color)
           VALUES (?, ?, ?, ?, ?, ?, 'not_started', ?)`
        )
        .run(
          parsed.data.title,
          parsed.data.author,
          parsed.data.category,
          file.name,
          stored.filePath,
          fileHash,
          colors[Math.floor(Math.random() * colors.length)]
        );

      const row = db
        .prepare("SELECT * FROM books WHERE id = ?")
        .get(result.lastInsertRowid) as Record<string, unknown>;

      return NextResponse.json(rowToBook(row), { status: 201 });
    } catch (error) {
      deletePdf(stored.filePath);
      throw error;
    }
  } catch (error) {
    console.error(
      "[books] upload failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return NextResponse.json(
      { error: "Unable to upload this PDF." },
      { status: 500 }
    );
  }
}
