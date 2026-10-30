import { NextResponse } from "next/server";
import fs from "node:fs";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await context.params;
  const row = db.prepare("SELECT file_path, file_name FROM books WHERE id = ?").get(Number(id)) as
    { file_path?: string; file_name?: string } | undefined;
  if (!row?.file_path || !fs.existsSync(row.file_path)) {
    return NextResponse.json({ error: "No PDF file is attached to this book." }, { status: 404 });
  }
  const buffer = fs.readFileSync(row.file_path);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${(row.file_name || "document.pdf").replace(/["\\]/g, "")}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
