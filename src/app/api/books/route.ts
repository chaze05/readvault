import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";

import { DuplicateBookError } from "@/lib/book-errors";
import { createBook, listBooks } from "@/lib/book-store";
import { getSession } from "@/lib/session-cookies";
import { parseCloudBookInput } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await listBooks(session.userId));
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseCloudBookInput(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const book = await createBook(session.userId, parsed.data);
    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateBookError) {
      await del(parsed.data.fileUrl).catch(() => {});
      return NextResponse.json(
        { error: error.message, bookId: error.existingId },
        { status: 409 }
      );
    }

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
