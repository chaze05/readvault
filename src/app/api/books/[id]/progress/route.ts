import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const page = Math.max(0, Math.floor(Number(body.currentPage) || 0));
  const row = db.prepare("SELECT id, total_pages FROM books WHERE id = ?").get(Number(id)) as { id: number; total_pages: number } | undefined;
  if (!row) return NextResponse.json({ error: "Book not found." }, { status: 404 });

  const status = row.total_pages > 0 && page >= row.total_pages ? "completed" : page > 0 ? "reading" : "not_started";
  db.prepare("UPDATE books SET current_page = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(page, status, Number(id));
  return NextResponse.json({ success: true, currentPage: page, status });
}
