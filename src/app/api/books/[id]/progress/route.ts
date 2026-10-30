import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { parseProgress } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await context.params;
  const bookId = Number(id);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return NextResponse.json({ error: "Invalid book id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseProgress(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const row = db
    .prepare("SELECT id, total_pages FROM books WHERE id = ?")
    .get(bookId) as { id: number; total_pages: number } | undefined;

  if (!row) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  const totalPages = parsed.data.totalPages ?? row.total_pages;
  const currentPage =
    totalPages > 0
      ? Math.min(parsed.data.currentPage, totalPages)
      : parsed.data.currentPage;
  const status =
    totalPages > 0 && currentPage >= totalPages
      ? "completed"
      : currentPage > 0
        ? "reading"
        : "not_started";

  db.prepare(
    `UPDATE books
     SET current_page = ?, total_pages = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(currentPage, totalPages, status, bookId);

  return NextResponse.json({
    success: true,
    currentPage,
    totalPages,
    status,
  });
}
