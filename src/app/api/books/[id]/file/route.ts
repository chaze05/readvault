import { NextResponse } from "next/server";

import { getBookFile } from "@/lib/book-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const bookId = Number(id);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return NextResponse.json({ error: "Invalid book id." }, { status: 400 });
  }

  const file = await getBookFile(bookId);
  if (!file) {
    return NextResponse.json(
      { error: "No PDF file is attached to this book." },
      { status: 404 }
    );
  }

  const fileName = file.fileName.replace(/["\\]/g, "");

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Content-Length": String(file.buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
