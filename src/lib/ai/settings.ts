import { query } from "@/lib/db";
import type { AiSettingsInput } from "@/lib/validation";

import {
  AI_PROVIDER_PRESETS,
  DEFAULT_AI_DAILY_LIMIT,
  type AiConfigSource,
  type AiProviderName,
} from "./config";
import { encryptSecret, SecretCryptoError } from "./crypto";
import { AiUrlError, validateAiBaseUrl } from "./url";

interface SettingsRow {
  ai_provider: string;
  ai_base_url: string;
  ai_model: string;
  ai_api_key_ciphertext: string | null;
  ai_api_key_hint: string | null;
  ai_daily_limit: number;
}

export type AiSettingsSource = AiConfigSource | "none";

export interface AiSettingsView {
  provider: AiProviderName;
  baseUrl: string;
  model: string;
  dailyLimit: number;
  hasKey: boolean;
  keyHint: string | null;
  source: AiSettingsSource;
  encryptionAvailable: boolean;
}

export type AiSettingsErrorCode =
  | "encryption_key_missing"
  | "invalid_url"
  | "settings_unavailable"
  | "save_failed"
  | "remove_failed";

export class AiSettingsError extends Error {
  readonly code: AiSettingsErrorCode;

  constructor(code: AiSettingsErrorCode, message: string) {
    super(message);
    this.name = "AiSettingsError";
    this.code = code;
  }
}

const ENCRYPTION_KEY_MISSING_ERROR =
  "Saving AI settings is disabled because SETTINGS_ENCRYPTION_KEY is not configured. Add a 32-byte base64 key to the server environment and restart ReadVault.";

function readEncryptionKey(): string | null {
  const value = process.env.SETTINGS_ENCRYPTION_KEY?.trim();

  if (!value) {
    return null;
  }

  return Buffer.from(value, "base64").length === 32 ? value : null;
}

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

function storedSettings(row: SettingsRow | undefined): {
  provider: AiProviderName;
  baseUrl: string;
  model: string;
  dailyLimit: number;
} {
  const provider = row
    ? normalizeProvider(row.ai_provider)
    : "deepseek";
  const preset = AI_PROVIDER_PRESETS[provider];

  return {
    provider,
    baseUrl: row?.ai_base_url?.trim() || preset.baseUrl,
    model: row?.ai_model?.trim() || preset.model,
    dailyLimit: normalizeDailyLimit(row?.ai_daily_limit),
  };
}

export async function getAiSettingsView(): Promise<AiSettingsView> {
  let row: SettingsRow | undefined;

  try {
    const result = await query<SettingsRow>(
      `select ai_provider, ai_base_url, ai_model,
              ai_api_key_ciphertext, ai_api_key_hint, ai_daily_limit
       from public.app_settings
       where id = 1`
    );
    row = result.rows[0];
  } catch {
    throw new AiSettingsError(
      "settings_unavailable",
      "AI settings are unavailable right now."
    );
  }

  const hasKey = Boolean(row?.ai_api_key_ciphertext);
  const environmentKey = process.env.AI_API_KEY?.trim();
  const source: AiSettingsSource = hasKey
    ? "database"
    : environmentKey
      ? "environment"
      : "none";

  if (source === "environment") {
    const baseUrl =
      process.env.AI_BASE_URL?.trim() ||
      AI_PROVIDER_PRESETS.deepseek.baseUrl;
    const provider = providerForBaseUrl(baseUrl);
    const preset = AI_PROVIDER_PRESETS[provider];

    return {
      provider,
      baseUrl,
      model: process.env.AI_MODEL?.trim() || preset.model,
      dailyLimit: normalizeDailyLimit(row?.ai_daily_limit),
      hasKey: false,
      keyHint: null,
      source,
      encryptionAvailable: Boolean(readEncryptionKey()),
    };
  }

  const settings = storedSettings(row);
  const hint = row?.ai_api_key_hint?.trim();

  return {
    ...settings,
    hasKey,
    keyHint: hasKey && hint ? hint.slice(-4) : null,
    source,
    encryptionAvailable: Boolean(readEncryptionKey()),
  };
}

export async function saveAiSettings(
  input: AiSettingsInput,
  updatedBy?: string
): Promise<void> {
  const encryptionKey = readEncryptionKey();

  if (!encryptionKey) {
    throw new AiSettingsError(
      "encryption_key_missing",
      ENCRYPTION_KEY_MISSING_ERROR
    );
  }

  let baseUrl: string;

  try {
    baseUrl = validateAiBaseUrl(input.baseUrl);
  } catch (error) {
    throw new AiSettingsError(
      "invalid_url",
      error instanceof AiUrlError
        ? error.message
        : "Enter a valid AI provider URL."
    );
  }

  const apiKey = input.apiKey?.trim() ?? "";
  let ciphertext: string | null = null;
  let keyHint: string | null = null;

  if (apiKey) {
    try {
      ciphertext = encryptSecret(apiKey, encryptionKey);
      keyHint = apiKey.slice(-4);
    } catch (error) {
      if (error instanceof SecretCryptoError) {
        throw new AiSettingsError(
          "encryption_key_missing",
          ENCRYPTION_KEY_MISSING_ERROR
        );
      }

      throw error;
    }
  }

  try {
    await query(
      `update public.app_settings
       set ai_provider = $1,
           ai_base_url = $2,
           ai_model = $3,
           ai_daily_limit = $4,
           ai_api_key_ciphertext = coalesce($5, ai_api_key_ciphertext),
           ai_api_key_hint = case
             when $5 is null then ai_api_key_hint
             else $6
           end,
           ai_updated_at = now(),
           ai_updated_by = $7
       where id = 1`,
      [
        input.provider,
        baseUrl,
        input.model.trim(),
        input.dailyLimit,
        ciphertext,
        keyHint,
        updatedBy ?? null,
      ]
    );
  } catch {
    throw new AiSettingsError(
      "save_failed",
      "Could not save AI settings. Please try again."
    );
  }
}

export async function removeAiKey(updatedBy?: string): Promise<void> {
  try {
    await query(
      `update public.app_settings
       set ai_api_key_ciphertext = null,
           ai_api_key_hint = null,
           ai_updated_at = now(),
           ai_updated_by = $1
       where id = 1`,
      [updatedBy ?? null]
    );
  } catch {
    throw new AiSettingsError(
      "remove_failed",
      "Could not remove the AI key. Please try again."
    );
  }
}
