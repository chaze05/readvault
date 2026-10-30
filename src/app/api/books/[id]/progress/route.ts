import { NextRequest, NextResponse } from "next/server";

import { saveProgress } from "@/lib/book-store";
import { requireActiveUser } from "@/lib/current-user";
import { isUuid } from "@/lib/uuid";
import { parseProgress } from "@/lib/validation";

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
  const parsed = parseProgress(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await saveProgress(
    user.id,
    id,
    parsed.data.currentPage,
    parsed.data.totalPages
  );

  if (!result) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, ...result });
}
