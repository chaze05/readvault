import type { AiStoryInput } from "@/lib/validation";

import type { AiConfig } from "./config";

export interface AiStoryDraft {
  title: string;
  description: string;
  pages: string[];
}

export type AiProviderErrorCode =
  | "timeout"
  | "connection_failed"
  | "provider_rejected"
  | "invalid_response";

export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;

  constructor(code: AiProviderErrorCode, message: string) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
  }
}

export function shouldRefundAiDraft(error: unknown): boolean {
  return (
    error instanceof AiProviderError &&
    (error.code === "connection_failed" || error.code === "provider_rejected")
  );
}

const SYSTEM_PROMPT = [
  "You write gentle, original children's stories for a parent-managed family library.",
  "Never include copyrighted characters, movie scripts, dialogue, or scene-by-scene retellings.",
  "If a movie or franchise is mentioned, use only broad themes like friendship, courage, family, kindness, or discovery, with original characters and settings.",
  "Keep content age-appropriate and positive. The parent reviews everything before publishing.",
  "Return ONLY valid JSON in this exact shape:",
  '{"title": string, "description": string, "pages": [string, ...]}',
  "Use 4 to 8 short pages. Each page should be 2-4 warm, readable sentences for reading aloud.",
].join(" ");

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

function buildUserPrompt(input: AiStoryInput): string {
  return [
    `Story type: ${
      input.storyType === "original"
        ? "original story"
        : "unofficial movie-inspired story"
    }.`,
    input.title ? `Working title: ${input.title}.` : "",
    input.sourceTitle
      ? `Theme inspiration only (do not reproduce characters or plot): ${input.sourceTitle}.`
      : "",
    `Reading level: ${input.ageRange}.`,
    `Parent's story idea: ${input.idea}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function providerErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "The AI provider rejected the saved key.";
  }

  if (status === 429) {
    return "The AI provider is rate limiting requests. Try again later.";
  }

  return "The AI provider could not complete the request.";
}

async function requestChatCompletion(
  config: AiConfig,
  options: ChatCompletionOptions
): Promise<string> {
  let response: Response;

  try {
    response = await fetch(
      `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          messages: options.messages,
        }),
        signal: AbortSignal.timeout(options.timeoutMs),
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new AiProviderError(
        "timeout",
        "The AI provider did not respond in time."
      );
    }

    throw new AiProviderError(
      "connection_failed",
      "Could not reach the AI provider."
    );
  }

  const data = (await response.json().catch(() => null)) as
    | ChatCompletionResponse
    | null;

  if (!response.ok) {
    throw new AiProviderError(
      "provider_rejected",
      providerErrorMessage(response.status)
    );
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new AiProviderError(
      "invalid_response",
      "The AI provider returned an empty response."
    );
  }

  return content;
}

function parseStoryDraft(raw: string): AiStoryDraft {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new AiProviderError(
      "invalid_response",
      "The AI response was not valid JSON."
    );
  }

  let draft: {
    title?: unknown;
    description?: unknown;
    pages?: unknown;
  };

  try {
    draft = JSON.parse(match[0]) as typeof draft;
  } catch {
    throw new AiProviderError(
      "invalid_response",
      "The AI response was not valid JSON."
    );
  }

  const pages = Array.isArray(draft.pages)
    ? draft.pages
        .map((page) => String(page ?? "").trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];

  if (!pages.length) {
    throw new AiProviderError(
      "invalid_response",
      "The AI did not return usable story pages."
    );
  }

  return {
    title: typeof draft.title === "string" ? draft.title.slice(0, 160) : "",
    description:
      typeof draft.description === "string"
        ? draft.description.slice(0, 1000)
        : "",
    pages,
  };
}

export async function generateAiStory(
  config: AiConfig,
  input: AiStoryInput
): Promise<AiStoryDraft> {
  const raw = await requestChatCompletion(config, {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
    temperature: 0.8,
    maxTokens: 1200,
    timeoutMs: 40_000,
  });

  return parseStoryDraft(raw);
}

export async function testAiProvider(
  config: AiConfig
): Promise<{ ok: true }> {
  await requestChatCompletion(config, {
    messages: [{ role: "user", content: "Reply with the word OK." }],
    temperature: 0,
    maxTokens: 5,
    timeoutMs: 15_000,
  });

  return { ok: true };
}
