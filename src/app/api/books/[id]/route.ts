import { NextRequest, NextResponse } from "next/server";

import { getDb, rowToBook } from "@/lib/db";
import { deletePdf } from "@/lib/storage";
import { parseBookUpdate } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(id: string): number | null {
  const value = Number(id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await context.params;
  const bookId = parseId(id);

  if (!bookId) {
    return NextResponse.json({ error: "Invalid book id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseBookUpdate(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = db
    .prepare(
      `UPDATE books
       SET title = ?, author = ?, category = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(
      parsed.data.title,
      parsed.data.author,
      parsed.data.category,
      bookId
    );

  if (result.changes === 0) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  const row = db
    .prepare("SELECT * FROM books WHERE id = ?")
    .get(bookId) as Record<string, unknown>;

  return NextResponse.json(rowToBook(row));
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await context.params;
  const bookId = parseId(id);

  if (!bookId) {
    return NextResponse.json({ error: "Invalid book id." }, { status: 400 });
  }

  const row = db
    .prepare("SELECT file_path FROM books WHERE id = ?")
    .get(bookId) as { file_path?: string } | undefined;

  if (!row) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  db.prepare("DELETE FROM books WHERE id = ?").run(bookId);

  let fileDeleted = false;
  if (row.file_path) {
    try {
      fileDeleted = deletePdf(row.file_path);
    } catch (error) {
      console.error(
        "[books] file cleanup failed:",
        error instanceof Error ? error.message : "unknown error"
      );
    }
  }

  return NextResponse.json({ success: true, fileDeleted });
}
