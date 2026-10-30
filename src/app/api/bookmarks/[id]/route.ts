import { NextRequest, NextResponse } from "next/server";

import {
  BookmarkNoteTooLongError,
  deleteBookmark,
  updateBookmarkNote,
} from "@/lib/bookmark-store";
import { requireActiveUser } from "@/lib/current-user";
import { AUTHENTICATED_CACHE_HEADERS } from "@/lib/http";
import { isUuid } from "@/lib/uuid";
import { bookmarkNoteSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: AUTHENTICATED_CACHE_HEADERS }
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireActiveUser();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return errorResponse("Invalid bookmark id.", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = bookmarkNoteSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? "Invalid bookmark note.",
      400
    );
  }

  try {
    const bookmark = await updateBookmarkNote(user.id, id, parsed.data.note);
    if (!bookmark) {
      return errorResponse("Bookmark not found.", 404);
    }

    return NextResponse.json(bookmark, {
      headers: AUTHENTICATED_CACHE_HEADERS,
    });
  } catch (error) {
    if (error instanceof BookmarkNoteTooLongError) {
      return errorResponse(error.message, 400);
    }

    console.error(
      "[bookmarks] note update failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return errorResponse("Unable to update this bookmark.", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireActiveUser();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return errorResponse("Invalid bookmark id.", 400);
  }

  const deleted = await deleteBookmark(user.id, id);
  if (!deleted) {
    return errorResponse("Bookmark not found.", 404);
  }

  return NextResponse.json(
    { success: true },
    { headers: AUTHENTICATED_CACHE_HEADERS }
  );
}
