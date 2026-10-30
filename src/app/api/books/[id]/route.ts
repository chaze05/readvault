import { NextRequest, NextResponse } from "next/server";

import { deleteBook, updateBook } from "@/lib/book-store";
import { getSession } from "@/lib/session-cookies";
import { isUuid } from "@/lib/uuid";
import { parseBookUpdate } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid book id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseBookUpdate(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const book = await updateBook(session.userId, id, parsed.data);
  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  return NextResponse.json(book);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid book id." }, { status: 400 });
  }

  const deleted = await deleteBook(session.userId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
