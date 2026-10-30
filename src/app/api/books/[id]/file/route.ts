import { NextResponse } from "next/server";

import { getBookFile } from "@/lib/book-store";
import { getSession } from "@/lib/session-cookies";
import { isUuid } from "@/lib/uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
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

  const file = await getBookFile(session.userId, id);
  if (!file) {
    return NextResponse.json(
      { error: "No PDF file is attached to this book." },
      { status: 404 }
    );
  }

  return NextResponse.redirect(file.fileUrl);
}
