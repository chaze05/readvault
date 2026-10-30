import { NextResponse } from "next/server";

import { requireActiveUser } from "@/lib/current-user";
import { buildUserExport } from "@/lib/data-export";

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
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="readvault-export-${date}.json"`,
        "Cache-Control": "no-store",
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
