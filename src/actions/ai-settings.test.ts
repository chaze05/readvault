import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/current-user", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/ai/config", () => ({
  AiConfigError: class AiConfigError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
      super(message);
      this.name = "AiConfigError";
      this.code = code;
    }
  },
  resolveAiConfig: vi.fn(),
}));

vi.mock("@/lib/ai/provider", () => ({
  AiProviderError: class AiProviderError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
      super(message);
      this.name = "AiProviderError";
      this.code = code;
    }
  },
  testAiProvider: vi.fn(),
}));

vi.mock("@/lib/ai/settings", () => ({
  AiSettingsError: class AiSettingsError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
      super(message);
      this.name = "AiSettingsError";
      this.code = code;
    }
  },
  getAiSettingsView: vi.fn(),
  saveAiSettings: vi.fn(),
  removeAiKey: vi.fn(),
}));

import { revalidatePath } from "next/cache";

import { AiConfigError, resolveAiConfig } from "@/lib/ai/config";
import { AiProviderError, testAiProvider } from "@/lib/ai/provider";
import {
  AiSettingsError,
  getAiSettingsView,
  removeAiKey,
  saveAiSettings,
} from "@/lib/ai/settings";
import { requireAdmin } from "@/lib/current-user";

import {
  removeAiKeyAction,
  saveAiSettingsAction,
  testAiConnectionAction,
} from "./ai-settings";

const ADMIN_REQUIRED_ERROR = "Only administrators can manage AI settings.";
const admin = {
  id: "admin-1",
  email: "owner@example.com",
  isAdmin: true,
  mustChangePassword: false,
  sessionVersion: 0,
};
const view = {
  provider: "deepseek" as const,
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-chat",
  dailyLimit: 10,
  hasKey: true,
  keyHint: "5678",
  source: "database" as const,
  encryptionAvailable: true,
};
const config = {
  provider: "deepseek" as const,
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-chat",
  apiKey: "fake-saved-key",
  dailyLimit: 10,
  source: "database" as const,
};

function buildFormData(values: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

function validFormData(key = ""): FormData {
  return buildFormData({
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
    apiKey: key,
    dailyLimit: "10",
  });
}

describe("saveAiSettingsAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(admin);
    vi.mocked(saveAiSettings).mockResolvedValue(undefined);
    vi.mocked(getAiSettingsView).mockResolvedValue(view);
  });

  it("rejects callers without admin access before doing any work", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);

    const result = await saveAiSettingsAction(
      buildFormData({
        provider: "deepseek",
        baseUrl: "not-a-url",
        model: "deepseek-chat",
        apiKey: "fake-key",
        dailyLimit: "10",
      })
    );

    expect(result).toEqual({ error: ADMIN_REQUIRED_ERROR });
    expect(saveAiSettings).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects invalid input without saving", async () => {
    const result = await saveAiSettingsAction(
      buildFormData({
        provider: "deepseek",
        baseUrl: "not-a-url",
        model: "deepseek-chat",
        apiKey: "",
        dailyLimit: "10",
      })
    );

    expect("error" in result).toBe(true);
    expect(saveAiSettings).not.toHaveBeenCalled();
  });

  it("saves trimmed input with the administrator id and returns the safe view", async () => {
    const result = await saveAiSettingsAction(
      validFormData("  sk-fake-test-key-5678  ")
    );

    expect(saveAiSettings).toHaveBeenCalledWith(
      {
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com",
        model: "deepseek-chat",
        apiKey: "sk-fake-test-key-5678",
        dailyLimit: 10,
      },
      "admin-1"
    );
    expect(getAiSettingsView).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(result).toEqual({ ok: true, settings: view });
  });

  it("returns safe settings errors without logging the submitted key", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(saveAiSettings).mockRejectedValue(
      new AiSettingsError(
        "encryption_key_missing",
        "Saving AI settings is disabled because SETTINGS_ENCRYPTION_KEY is not configured."
      )
    );

    const result = await saveAiSettingsAction(
      validFormData("sk-fake-test-key-5678")
    );

    expect(result).toEqual({
      error:
        "Saving AI settings is disabled because SETTINGS_ENCRYPTION_KEY is not configured.",
    });
    expect(getAiSettingsView).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "sk-fake-test-key-5678"
    );
    consoleError.mockRestore();
  });

  it("returns a generic error for an unexpected save failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(saveAiSettings).mockRejectedValue(new Error("database down"));

    const result = await saveAiSettingsAction(
      validFormData("sk-fake-test-key-5678")
    );

    expect(result).toEqual({
      error: "Could not save AI settings. Please try again.",
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "sk-fake-test-key-5678"
    );
    consoleError.mockRestore();
  });
});

describe("removeAiKeyAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(admin);
    vi.mocked(removeAiKey).mockResolvedValue(undefined);
    vi.mocked(getAiSettingsView).mockResolvedValue({
      ...view,
      hasKey: false,
      keyHint: null,
      source: "none",
    });
  });

  it("rejects callers without admin access before doing any work", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);

    const result = await removeAiKeyAction();

    expect(result).toEqual({ error: ADMIN_REQUIRED_ERROR });
    expect(removeAiKey).not.toHaveBeenCalled();
  });

  it("removes the key with the administrator id and revalidates settings", async () => {
    const result = await removeAiKeyAction();

    expect(removeAiKey).toHaveBeenCalledWith("admin-1");
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(result).toEqual({
      ok: true,
      settings: {
        ...view,
        hasKey: false,
        keyHint: null,
        source: "none",
      },
    });
  });

  it("returns safe settings errors", async () => {
    vi.mocked(removeAiKey).mockRejectedValue(
      new AiSettingsError("remove_failed", "Could not remove the AI key.")
    );

    const result = await removeAiKeyAction();

    expect(result).toEqual({ error: "Could not remove the AI key." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("testAiConnectionAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(admin);
    vi.mocked(resolveAiConfig).mockResolvedValue(config);
    vi.mocked(testAiProvider).mockResolvedValue({ ok: true });
  });

  it("rejects callers without admin access before resolving configuration", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);

    const result = await testAiConnectionAction();

    expect(result).toEqual({ error: ADMIN_REQUIRED_ERROR });
    expect(resolveAiConfig).not.toHaveBeenCalled();
    expect(testAiProvider).not.toHaveBeenCalled();
  });

  it("asks the administrator to save a key when AI is not configured", async () => {
    vi.mocked(resolveAiConfig).mockResolvedValue(null);

    const result = await testAiConnectionAction();

    expect(result).toEqual({
      error: "Save an AI key before testing the connection.",
    });
    expect(testAiProvider).not.toHaveBeenCalled();
  });

  it("tests the saved configuration without reserving draft usage", async () => {
    const result = await testAiConnectionAction();

    expect(resolveAiConfig).toHaveBeenCalledOnce();
    expect(testAiProvider).toHaveBeenCalledWith(config);
    expect(result).toEqual({ ok: true });
  });

  it("returns the safe provider message when the connection test fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(testAiProvider).mockRejectedValue(
      new AiProviderError(
        "provider_rejected",
        "The AI provider rejected the saved key."
      )
    );

    const result = await testAiConnectionAction();

    expect(result).toEqual({
      error: "The AI provider rejected the saved key.",
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      config.apiKey
    );
    consoleError.mockRestore();
  });

  it("returns the safe configuration message when configuration is unavailable", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(resolveAiConfig).mockRejectedValue(
      new AiConfigError(
        "decryption_key_missing",
        "AI settings cannot be decrypted because SETTINGS_ENCRYPTION_KEY is not configured."
      )
    );

    const result = await testAiConnectionAction();

    expect(result).toEqual({
      error:
        "AI settings cannot be decrypted because SETTINGS_ENCRYPTION_KEY is not configured.",
    });
    expect(testAiProvider).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("returns a generic error for an unexpected failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(testAiProvider).mockRejectedValue(new Error("boom"));

    const result = await testAiConnectionAction();

    expect(result).toEqual({
      error: "Could not test the AI connection. Please try again.",
    });
    consoleError.mockRestore();
  });
});
