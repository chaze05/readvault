import { NextRequest, NextResponse } from "next/server";

import { saveStoryProgress } from "@/lib/story-store";
import { getSession } from "@/lib/session-cookies";
import { isUuid } from "@/lib/uuid";

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
    return NextResponse.json({ error: "Invalid story id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const currentPage = Number(body?.currentPage);

  if (!Number.isFinite(currentPage)) {
    return NextResponse.json({ error: "Invalid page." }, { status: 400 });
  }

  const result = await saveStoryProgress(session.userId, id, currentPage);
  if (!result) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, ...result });
}
