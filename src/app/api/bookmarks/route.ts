import { NextRequest, NextResponse } from "next/server";

import { BookmarkError, listBookmarks, saveBookmark } from "@/lib/bookmark-store";
import { requireActiveUser } from "@/lib/current-user";
import { AUTHENTICATED_CACHE_HEADERS } from "@/lib/http";
import { isUuid } from "@/lib/uuid";
import { bookmarkTargetSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: AUTHENTICATED_CACHE_HEADERS }
  );
}

export async function GET(request: NextRequest) {
  const user = await requireActiveUser();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const bookId = searchParams.get("bookId");
  const storyId = searchParams.get("storyId");

  if (bookId !== null && storyId !== null) {
    return errorResponse("Choose either bookId or storyId, not both.", 400);
  }

  if (bookId !== null && !isUuid(bookId)) {
    return errorResponse("Invalid book id.", 400);
  }

  if (storyId !== null && !isUuid(storyId)) {
    return errorResponse("Invalid story id.", 400);
  }

  const target =
    bookId !== null
      ? ({ kind: "book", id: bookId } as const)
      : storyId !== null
        ? ({ kind: "story", id: storyId } as const)
        : undefined;

  return NextResponse.json(await listBookmarks(user.id, target), {
    headers: AUTHENTICATED_CACHE_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireActiveUser();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = bookmarkTargetSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? "Invalid bookmark.",
      400
    );
  }

  const target = parsed.data.bookId
    ? {
        kind: "book" as const,
        id: parsed.data.bookId,
        pageNumber: parsed.data.pageNumber,
      }
    : {
        kind: "story" as const,
        id: parsed.data.storyId as string,
        pageNumber: parsed.data.pageNumber,
      };

  try {
    const bookmark = await saveBookmark(user.id, target);
    return NextResponse.json(bookmark, {
      headers: AUTHENTICATED_CACHE_HEADERS,
    });
  } catch (error) {
    if (error instanceof BookmarkError) {
      return errorResponse(
        error.message,
        error.code === "target_not_found" ? 404 : 400
      );
    }

    console.error(
      "[bookmarks] save failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return errorResponse("Unable to save this bookmark.", 500);
  }
}
