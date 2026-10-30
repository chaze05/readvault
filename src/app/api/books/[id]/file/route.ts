import { NextResponse } from "next/server";

import { getBookFile } from "@/lib/book-store";
import { requireActiveUser } from "@/lib/current-user";
import { isUuid } from "@/lib/uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
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

  const file = await getBookFile(user.id, id);
  if (!file) {
    return NextResponse.json(
      { error: "No PDF file is attached to this book." },
      { status: 404 }
    );
  }

  return NextResponse.redirect(file.fileUrl);
}
