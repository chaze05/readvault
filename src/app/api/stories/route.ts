import { NextRequest, NextResponse } from "next/server";

import { createStory, listStories } from "@/lib/story-store";
import { requireActiveUser } from "@/lib/current-user";
import { AUTHENTICATED_CACHE_HEADERS } from "@/lib/http";
import { parseStoryInput } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await listStories(user.id), {
    headers: AUTHENTICATED_CACHE_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseStoryInput(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const id = await createStory(user.id, parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error(
      "[stories] create failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return NextResponse.json(
      { error: "Unable to create this story." },
      { status: 500 }
    );
  }
}
