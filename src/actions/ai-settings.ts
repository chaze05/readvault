"use server";

import { revalidatePath } from "next/cache";

import { AiConfigError, resolveAiConfig } from "@/lib/ai/config";
import { AiProviderError, testAiProvider } from "@/lib/ai/provider";
import {
  AiSettingsError,
  getAiSettingsView,
  removeAiKey,
  saveAiSettings,
  type AiSettingsView,
} from "@/lib/ai/settings";
import { requireAdmin } from "@/lib/current-user";
import { aiSettingsInputSchema } from "@/lib/validation";

const ADMIN_REQUIRED_ERROR =
  "Only administrators can manage AI settings.";
const INVALID_INPUT_ERROR = "Choose valid AI settings.";
const SAVE_FAILED_ERROR =
  "Could not save AI settings. Please try again.";
const REMOVE_FAILED_ERROR =
  "Could not remove the AI key. Please try again.";
const TEST_NOT_CONFIGURED_ERROR =
  "Save an AI key before testing the connection.";
const TEST_FAILED_ERROR =
  "Could not test the AI connection. Please try again.";
const SETTINGS_UNAVAILABLE_ERROR =
  "AI settings are unavailable right now.";

export type AiSettingsActionResult =
  | { ok: true; settings: AiSettingsView | null }
  | { error: string };

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function safeSettingsView(): Promise<AiSettingsView | null> {
  try {
    return await getAiSettingsView();
  } catch {
    return null;
  }
}

function logSafeError(action: string, error: unknown): void {
  console.error(
    `[ai-settings] ${action} failed:`,
    error instanceof AiSettingsError
      ? error.code
      : error instanceof AiConfigError
        ? error.code
        : error instanceof AiProviderError
          ? error.code
          : "unexpected"
  );
}

export async function saveAiSettingsAction(
  formData: FormData
): Promise<AiSettingsActionResult> {
  const admin = await requireAdmin();

  if (!admin) {
    return { error: ADMIN_REQUIRED_ERROR };
  }

  const parsed = aiSettingsInputSchema.safeParse({
    provider: formString(formData, "provider"),
    baseUrl: formString(formData, "baseUrl"),
    model: formString(formData, "model"),
    apiKey: formString(formData, "apiKey"),
    dailyLimit: Number(formString(formData, "dailyLimit")),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? INVALID_INPUT_ERROR,
    };
  }

  try {
    await saveAiSettings(parsed.data, admin.id);

    try {
      revalidatePath("/settings");
    } catch (error) {
      console.error(
        "[ai-settings] settings revalidation failed:",
        error instanceof Error ? "revalidate_failed" : "unexpected"
      );
    }

    return { ok: true, settings: await safeSettingsView() };
  } catch (error) {
    if (error instanceof AiSettingsError) {
      return { error: error.message };
    }

    logSafeError("save", error);
    return { error: SAVE_FAILED_ERROR };
  }
}

export async function removeAiKeyAction(): Promise<AiSettingsActionResult> {
  const admin = await requireAdmin();

  if (!admin) {
    return { error: ADMIN_REQUIRED_ERROR };
  }

  try {
    await removeAiKey(admin.id);

    try {
      revalidatePath("/settings");
    } catch (error) {
      console.error(
        "[ai-settings] settings revalidation failed:",
        error instanceof Error ? "revalidate_failed" : "unexpected"
      );
    }

    return { ok: true, settings: await safeSettingsView() };
  } catch (error) {
    if (error instanceof AiSettingsError) {
      return { error: error.message };
    }

    logSafeError("remove", error);
    return { error: REMOVE_FAILED_ERROR };
  }
}

export async function testAiConnectionAction(): Promise<
  { ok: true } | { error: string }
> {
  const admin = await requireAdmin();

  if (!admin) {
    return { error: ADMIN_REQUIRED_ERROR };
  }

  let config: Awaited<ReturnType<typeof resolveAiConfig>>;

  try {
    config = await resolveAiConfig();
  } catch (error) {
    logSafeError("test configuration", error);
    return {
      error:
        error instanceof AiConfigError
          ? error.message
          : SETTINGS_UNAVAILABLE_ERROR,
    };
  }

  if (!config) {
    return { error: TEST_NOT_CONFIGURED_ERROR };
  }

  try {
    await testAiProvider(config);
    return { ok: true };
  } catch (error) {
    if (error instanceof AiProviderError) {
      return { error: error.message };
    }

    logSafeError("test", error);
    return { error: TEST_FAILED_ERROR };
  }
}
