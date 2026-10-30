import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";

import {
  BlobClaimError,
  isBlobUrlClaimedByUser,
} from "@/lib/blob-claims";
import { DuplicateBookError } from "@/lib/book-errors";
import { createBook, listBooks } from "@/lib/book-store";
import { requireActiveUser } from "@/lib/current-user";
import { AUTHENTICATED_CACHE_HEADERS } from "@/lib/http";
import { parseCloudBookInput } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await listBooks(user.id), {
    headers: AUTHENTICATED_CACHE_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseCloudBookInput(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const book = await createBook(user.id, parsed.data);
    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateBookError) {
      if (await isBlobUrlClaimedByUser(user.id, parsed.data.fileUrl)) {
        await del(parsed.data.fileUrl).catch(() => {});
      }
      return NextResponse.json(
        { error: error.message, bookId: error.existingId },
        { status: 409 }
      );
    }

    if (error instanceof BlobClaimError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
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
