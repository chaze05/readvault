import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/session-cookies";
import { parseAiStoryInput } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AiStoryPage {
  title?: string;
  description?: string;
  pages?: unknown;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI story generation is not configured. Add AI_API_KEY in Vercel or .env.local.",
      },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = parseAiStoryInput(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const baseUrl = (process.env.AI_BASE_URL ?? "https://api.deepseek.com").replace(
    /\/$/,
    ""
  );
  const model = process.env.AI_MODEL ?? "deepseek-chat";

  const system = [
    "You write gentle, original children's stories for a parent-managed family library.",
    "Never include copyrighted characters, movie scripts, dialogue, or scene-by-scene retellings.",
    "If a movie or franchise is mentioned, use only broad themes like friendship, courage, family, kindness, or discovery, with original characters and settings.",
    "Keep content age-appropriate and positive. The parent reviews everything before publishing.",
    "Return ONLY valid JSON in this exact shape:",
    '{"title": string, "description": string, "pages": [string, ...]}',
    "Use 4 to 8 short pages. Each page should be 2-4 warm, readable sentences for reading aloud.",
  ].join(" ");

  const user = [
    `Story type: ${parsed.data.storyType === "original" ? "original story" : "unofficial movie-inspired story"}.`,
    parsed.data.title ? `Working title: ${parsed.data.title}.` : "",
    parsed.data.sourceTitle
      ? `Theme inspiration only (do not reproduce characters or plot): ${parsed.data.sourceTitle}.`
      : "",
    `Reading level: ${parsed.data.ageRange}.`,
    `Parent's story idea: ${parsed.data.idea}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        max_tokens: 1200,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(40_000),
    });

    const data = (await response.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    } | null;

    if (!response.ok) {
      throw new Error(data?.error?.message ?? `AI request failed (${response.status}).`);
    }

    const raw = data?.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("The AI response was not valid JSON.");

    const draft = JSON.parse(match[0]) as AiStoryPage;
    const pages = Array.isArray(draft.pages)
      ? draft.pages
          .map((page) => String(page ?? "").trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];

    if (!pages.length) {
      throw new Error("The AI did not return usable story pages.");
    }

    return NextResponse.json({
      title: typeof draft.title === "string" ? draft.title.slice(0, 160) : "",
      description:
        typeof draft.description === "string"
          ? draft.description.slice(0, 1000)
          : "",
      pages,
    });
  } catch (error) {
    console.error(
      "[ai-story] generation failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate a story draft.",
      },
      { status: 502 }
    );
  }
}
