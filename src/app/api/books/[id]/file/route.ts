import { NextResponse } from "next/server";
import fs from "node:fs";

import { getDb } from "@/lib/db";
import { isInsideUploads } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await context.params;
  const bookId = Number(id);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return NextResponse.json({ error: "Invalid book id." }, { status: 400 });
  }

  const row = db
    .prepare("SELECT file_path, file_name FROM books WHERE id = ?")
    .get(bookId) as { file_path?: string; file_name?: string } | undefined;

  if (
    !row?.file_path ||
    !isInsideUploads(row.file_path) ||
    !fs.existsSync(row.file_path)
  ) {
    return NextResponse.json(
      { error: "No PDF file is attached to this book." },
      { status: 404 }
    );
  }

  const buffer = fs.readFileSync(row.file_path);
  const fileName = (row.file_name || "document.pdf").replace(/["\\]/g, "");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
