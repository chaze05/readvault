import { NextRequest, NextResponse } from "next/server";

import { deleteStory, getStory, updateStory } from "@/lib/story-store";
import { getSession } from "@/lib/session-cookies";
import { isUuid } from "@/lib/uuid";
import { parseStoryInput } from "@/lib/validation";

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
    return NextResponse.json({ error: "Invalid story id." }, { status: 400 });
  }

  const story = await getStory(session.userId, id);
  if (!story) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  return NextResponse.json(story);
}

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
  const parsed = parseStoryInput(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const updated = await updateStory(session.userId, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  return NextResponse.json(await getStory(session.userId, id));
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
    return NextResponse.json({ error: "Invalid story id." }, { status: 400 });
  }

  const deleted = await deleteStory(session.userId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
