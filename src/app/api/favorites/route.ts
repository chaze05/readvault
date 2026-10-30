import { NextRequest, NextResponse } from "next/server";

import { setFavorite } from "@/lib/bookmark-store";
import { requireActiveUser } from "@/lib/current-user";
import { AUTHENTICATED_CACHE_HEADERS } from "@/lib/http";
import { favoriteInputSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: AUTHENTICATED_CACHE_HEADERS }
  );
}

export async function PATCH(request: NextRequest) {
  const user = await requireActiveUser();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = favoriteInputSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? "Invalid favorite.",
      400
    );
  }

  const { kind, id, isFavorite } = parsed.data;
  const updated = await setFavorite(user.id, kind, id, isFavorite);

  if (!updated) {
    return errorResponse(
      kind === "book" ? "Book not found." : "Story not found.",
      404
    );
  }

  return NextResponse.json(
    { kind, id, isFavorite },
    { headers: AUTHENTICATED_CACHE_HEADERS }
  );
}
