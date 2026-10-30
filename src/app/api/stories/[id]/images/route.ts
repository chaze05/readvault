import { NextRequest, NextResponse } from "next/server";

import { attachStoryImage } from "@/lib/story-store";
import { requireActiveUser } from "@/lib/current-user";
import { isUuid } from "@/lib/uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
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
  const url = String(body?.url ?? "");
  const kind = body?.kind === "cover" ? "cover" : "page";
  const pageId = body?.pageId ? String(body.pageId) : undefined;

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Invalid image URL." }, { status: 400 });
  }

  if (pageId && !isUuid(pageId)) {
    return NextResponse.json({ error: "Invalid page id." }, { status: 400 });
  }

  try {
    const result = await attachStoryImage(user.id, id, {
      url,
      kind,
      pageId,
      alt: String(body?.alt ?? "").slice(0, 300),
    });

    if (!result) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, imageUrl: result.imageUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save the image.",
      },
      { status: 400 }
    );
  }
}
