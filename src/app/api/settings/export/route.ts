import { NextResponse } from "next/server";

import { requireActiveUser } from "@/lib/current-user";
import { buildUserExport } from "@/lib/data-export";
import { AUTHENTICATED_CACHE_HEADERS } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const document = await buildUserExport(user.id);

    if (!document) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const date = document.exportedAt.slice(0, 10);
    return new NextResponse(JSON.stringify(document, null, 2), {
      status: 200,
      headers: {
        ...AUTHENTICATED_CACHE_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="readvault-export-${date}.json"`,
      },
    });
  } catch (error) {
    console.error(
      "[settings] export failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return NextResponse.json(
      { error: "Could not build your data export. Please try again." },
      { status: 500 }
    );
  }
}
