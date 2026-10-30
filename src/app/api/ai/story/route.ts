import { NextRequest, NextResponse } from "next/server";

import {
  AiConfigError,
  resolveAiConfig,
  type AiConfig,
} from "@/lib/ai/config";
import {
  AiProviderError,
  generateAiStory,
} from "@/lib/ai/provider";
import {
  refundAiDraft,
  reserveAiDraft,
  type AiDraftUsage,
} from "@/lib/ai/usage";
import { requireActiveUser } from "@/lib/current-user";
import { parseAiStoryInput } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const currentUser = await requireActiveUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let config: AiConfig | null;
  try {
    config = await resolveAiConfig();
  } catch (error) {
    console.error(
      "[ai-story] configuration unavailable:",
      error instanceof AiConfigError ? error.code : "unexpected"
    );

    return NextResponse.json(
      {
        error:
          error instanceof AiConfigError
            ? error.message
            : "AI story generation is unavailable right now.",
      },
      { status: 503 }
    );
  }

  if (!config) {
    return NextResponse.json(
      {
        error:
          "AI story generation is not configured. Ask an administrator to add an AI key.",
      },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = parseAiStoryInput(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let usage: AiDraftUsage;
  try {
    usage = await reserveAiDraft(currentUser.id, config.dailyLimit);
  } catch {
    console.error("[ai-story] usage reservation unavailable");

    return NextResponse.json(
      { error: "Could not verify AI usage. Try again later." },
      { status: 503 }
    );
  }

  if (!usage.allowed) {
    const resetAt = usage.resetAt.toISOString();
    const retryAfter = Math.max(
      1,
      Math.ceil((usage.resetAt.getTime() - Date.now()) / 1000)
    );

    return NextResponse.json(
      {
        error: `Daily AI draft limit reached (${usage.limit}). Try again after ${resetAt}.`,
        usage: { used: usage.used, limit: usage.limit, resetAt },
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  try {
    const draft = await generateAiStory(config, parsed.data);
    return NextResponse.json(draft);
  } catch (error) {
    await refundAiDraft(currentUser.id).catch(() => {});

    console.error(
      "[ai-story] generation failed:",
      error instanceof AiProviderError ? error.code : "unexpected"
    );

    return NextResponse.json(
      {
        error:
          error instanceof AiProviderError
            ? error.message
            : "Could not generate a story draft.",
      },
      { status: 502 }
    );
  }
}
