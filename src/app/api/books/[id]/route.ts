import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const row = db.prepare("SELECT file_path FROM books WHERE id = ?").get(Number(id)) as { file_path?: string } | undefined;
  if (!row) return NextResponse.json({ error: "Book not found." }, { status: 404 });

  db.prepare("DELETE FROM books WHERE id = ?").run(Number(id));
  if (row.file_path && fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
  return NextResponse.json({ success: true });
}
