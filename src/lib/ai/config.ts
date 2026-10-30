import { query } from "@/lib/db";

import { decryptSecret } from "./crypto";
import { AiUrlError, validateAiBaseUrl } from "./url";

export type AiProviderName = "deepseek" | "openai" | "custom";
export type AiConfigSource = "database" | "environment";

export interface AiConfig {
  provider: AiProviderName;
  baseUrl: string;
  model: string;
  apiKey: string;
  dailyLimit: number;
  source: AiConfigSource;
}

export type AiConfigErrorCode =
  | "decryption_key_missing"
  | "decrypt_failed"
  | "empty_key"
  | "invalid_url"
  | "settings_unavailable";

export class AiConfigError extends Error {
  readonly code: AiConfigErrorCode;

  constructor(code: AiConfigErrorCode, message: string) {
    super(message);
    this.name = "AiConfigError";
    this.code = code;
  }
}

interface SettingsRow {
  ai_provider: string;
  ai_base_url: string;
  ai_model: string;
  ai_api_key_ciphertext: string | null;
  ai_daily_limit: number;
}

export const DEFAULT_AI_DAILY_LIMIT = 10;

export const AI_PROVIDER_PRESETS = {
  deepseek: {
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  custom: {
    baseUrl: "",
    model: "",
  },
} as const satisfies Record<
  AiProviderName,
  { baseUrl: string; model: string }
>;

function normalizeDailyLimit(value: number | null | undefined): number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 1 &&
    value <= 100
    ? Math.trunc(value)
    : DEFAULT_AI_DAILY_LIMIT;
}

function normalizeProvider(value: string | null | undefined): AiProviderName {
  return value === "deepseek" || value === "openai" || value === "custom"
    ? value
    : "custom";
}

function providerForBaseUrl(baseUrl: string): AiProviderName {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    if (host === "api.deepseek.com") return "deepseek";
    if (host === "api.openai.com") return "openai";
  } catch {
    // The URL is validated separately.
  }

  return "custom";
}

function validateConfiguredUrl(rawUrl: string | null | undefined): string {
  try {
    return validateAiBaseUrl(rawUrl ?? "");
  } catch (error) {
    throw new AiConfigError(
      "invalid_url",
      error instanceof AiUrlError
        ? error.message
        : "The configured AI provider URL is not allowed."
    );
  }
}

export async function resolveAiConfig(): Promise<AiConfig | null> {
  let row: SettingsRow | undefined;

  try {
    const result = await query<SettingsRow>(
      `select ai_provider, ai_base_url, ai_model,
              ai_api_key_ciphertext, ai_daily_limit
       from public.app_settings
       where id = 1`
    );
    row = result.rows[0];
  } catch {
    throw new AiConfigError(
      "settings_unavailable",
      "AI settings are unavailable right now."
    );
  }

  const dailyLimit = normalizeDailyLimit(row?.ai_daily_limit);

  if (row?.ai_api_key_ciphertext) {
    const encryptionKey = process.env.SETTINGS_ENCRYPTION_KEY?.trim();

    if (!encryptionKey) {
      throw new AiConfigError(
        "decryption_key_missing",
        "AI settings cannot be decrypted because SETTINGS_ENCRYPTION_KEY is not configured."
      );
    }

    let apiKey: string;
    try {
      apiKey = decryptSecret(
        row.ai_api_key_ciphertext,
        encryptionKey
      ).trim();
    } catch {
      throw new AiConfigError(
        "decrypt_failed",
        "AI settings could not be decrypted. Ask an administrator to re-save the AI key."
      );
    }

    if (!apiKey) {
      throw new AiConfigError(
        "empty_key",
        "The saved AI key is empty. Ask an administrator to replace it."
      );
    }

    const provider = normalizeProvider(row.ai_provider);

    return {
      provider,
      baseUrl: validateConfiguredUrl(row.ai_base_url),
      model:
        row.ai_model?.trim() ||
        AI_PROVIDER_PRESETS[provider].model ||
        AI_PROVIDER_PRESETS.deepseek.model,
      apiKey,
      dailyLimit,
      source: "database",
    };
  }

  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const baseUrl = validateConfiguredUrl(
    process.env.AI_BASE_URL?.trim() || AI_PROVIDER_PRESETS.deepseek.baseUrl
  );
  const provider = providerForBaseUrl(baseUrl);

  return {
    provider,
    baseUrl,
    model:
      process.env.AI_MODEL?.trim() ||
      AI_PROVIDER_PRESETS[provider].model ||
      AI_PROVIDER_PRESETS.deepseek.model,
    apiKey,
    dailyLimit,
    source: "environment",
  };
}
