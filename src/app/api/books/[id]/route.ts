import { NextRequest, NextResponse } from "next/server";

import { deleteBook, updateBook } from "@/lib/book-store";
import { requireActiveUser } from "@/lib/current-user";
import { isUuid } from "@/lib/uuid";
import { parseBookUpdate } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireActiveUser();
  if (!user) {
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

  const book = await updateBook(user.id, id, parsed.data);
  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  return NextResponse.json(book);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid book id." }, { status: 400 });
  }

  const deleted = await deleteBook(user.id, id);
  if (!deleted) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
