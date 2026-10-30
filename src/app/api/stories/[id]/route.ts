import { NextRequest, NextResponse } from "next/server";

import { deleteStory, getStory, updateStory } from "@/lib/story-store";
import { requireActiveUser } from "@/lib/current-user";
import { AUTHENTICATED_CACHE_HEADERS } from "@/lib/http";
import { isUuid } from "@/lib/uuid";
import { parseStoryInput } from "@/lib/validation";

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
    return NextResponse.json({ error: "Invalid story id." }, { status: 400 });
  }

  const story = await getStory(user.id, id);
  if (!story) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  return NextResponse.json(story, {
    headers: AUTHENTICATED_CACHE_HEADERS,
  });
}

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
    return NextResponse.json({ error: "Invalid story id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseStoryInput(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const updated = await updateStory(user.id, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  return NextResponse.json(await getStory(user.id, id));
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
    return NextResponse.json({ error: "Invalid story id." }, { status: 400 });
  }

  const deleted = await deleteStory(user.id, id);
  if (!deleted) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
