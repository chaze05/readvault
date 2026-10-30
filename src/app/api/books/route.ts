import { NextRequest, NextResponse } from "next/server";

import { DuplicateBookError } from "@/lib/book-errors";
import { createBook, listBooks } from "@/lib/book-store";
import { sha256 } from "@/lib/hash";
import { isCloudMode } from "@/lib/storage-mode";
import {
  MAX_FILE_BYTES,
  hasPdfSignature,
  parseBookInput,
  parseCloudBookInput,
} from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const books = await listBooks();
  return NextResponse.json(books);
}

export async function POST(request: NextRequest) {
  try {
    if (isCloudMode()) {
      const body = await request.json().catch(() => null);
      const parsed = parseCloudBookInput(body);

      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }

      try {
        const book = await createBook({ ...parsed.data });
        return NextResponse.json(book, { status: 201 });
      } catch (error) {
        if (error instanceof DuplicateBookError) {
          const { cleanupCloudBlob } = await import("@/lib/cloud-store");
          await cleanupCloudBlob(parsed.data.fileUrl);
          return NextResponse.json(
            { error: error.message, bookId: error.existingId },
            { status: 409 }
          );
        }
        throw error;
      }
    }

    const form = await request.formData();
    const parsed = parseBookInput(form);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Please select a PDF file." },
        { status: 400 }
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Only PDF files are supported." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "PDF must be 50 MB or smaller." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasPdfSignature(buffer)) {
      return NextResponse.json(
        { error: "This file does not look like a valid PDF." },
        { status: 400 }
      );
    }

    const book = await createBook({
      ...parsed.data,
      fileName: file.name,
      fileHash: sha256(buffer),
      buffer,
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateBookError) {
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
