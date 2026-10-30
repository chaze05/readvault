import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";

import { decryptSecret } from "./crypto";
import {
  AiSettingsError,
  getAiSettingsView,
  removeAiKey,
  saveAiSettings,
} from "./settings";

const encryptionKey = Buffer.alloc(32, 5).toString("base64");
const row = {
  ai_provider: "openai",
  ai_base_url: "https://api.openai.com/v1",
  ai_model: "gpt-4o-mini",
  ai_api_key_ciphertext: "v1.fake.envelope.ciphertext",
  ai_api_key_hint: "1234",
  ai_daily_limit: 25,
};

function queryResult(rows: unknown[]): never {
  return { rows } as never;
}

describe("getAiSettingsView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("SETTINGS_ENCRYPTION_KEY", encryptionKey);
    vi.stubEnv("AI_API_KEY", "");
    vi.stubEnv("AI_BASE_URL", "");
    vi.stubEnv("AI_MODEL", "");
    vi.stubEnv("AI_ALLOWED_HOSTS", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the saved settings without exposing the ciphertext", async () => {
    vi.mocked(query).mockResolvedValue(queryResult([row]));

    const view = await getAiSettingsView();

    expect(view).toEqual({
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      dailyLimit: 25,
      hasKey: true,
      keyHint: "1234",
      source: "database",
      encryptionAvailable: true,
    });
    expect(JSON.stringify(view)).not.toContain(row.ai_api_key_ciphertext);
  });

  it("only exposes the last four characters of a stored hint", async () => {
    vi.mocked(query).mockResolvedValue(
      queryResult([{ ...row, ai_api_key_hint: "raw-looking-hint-9876" }])
    );

    const view = await getAiSettingsView();

    expect(view.keyHint).toBe("9876");
    expect(JSON.stringify(view)).not.toContain("raw-looking-hint");
  });

  it("reports the environment fallback when no database key exists", async () => {
    vi.mocked(query).mockResolvedValue(
      queryResult([
        {
          ...row,
          ai_api_key_ciphertext: null,
          ai_api_key_hint: "stale",
          ai_daily_limit: 15,
        },
      ])
    );
    vi.stubEnv("AI_API_KEY", "fake-environment-key");
    vi.stubEnv("AI_BASE_URL", "https://api.openai.com/v1");
    vi.stubEnv("AI_MODEL", "gpt-4o-mini");

    const view = await getAiSettingsView();

    expect(view).toEqual({
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      dailyLimit: 15,
      hasKey: false,
      keyHint: null,
      source: "environment",
      encryptionAvailable: true,
    });
  });

  it("reports an unconfigured state when neither a database nor environment key exists", async () => {
    vi.mocked(query).mockResolvedValue(queryResult([]));

    const view = await getAiSettingsView();

    expect(view).toEqual({
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat",
      dailyLimit: 10,
      hasKey: false,
      keyHint: null,
      source: "none",
      encryptionAvailable: true,
    });
  });

  it("reports that saving is unavailable when the encryption key is missing", async () => {
    vi.mocked(query).mockResolvedValue(queryResult([row]));
    vi.stubEnv("SETTINGS_ENCRYPTION_KEY", "");

    const view = await getAiSettingsView();

    expect(view.encryptionAvailable).toBe(false);
  });

  it("fails with a safe error when settings cannot be read", async () => {
    vi.mocked(query).mockRejectedValue(new Error("database down"));

    await expect(getAiSettingsView()).rejects.toMatchObject({
      name: "AiSettingsError",
      code: "settings_unavailable",
    });
  });
});

describe("saveAiSettings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("SETTINGS_ENCRYPTION_KEY", encryptionKey);
    vi.stubEnv("AI_ALLOWED_HOSTS", "");
    vi.mocked(query).mockResolvedValue(queryResult([]));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("encrypts a new key and stores only its ciphertext and last four characters", async () => {
    const apiKey = "sk-fake-test-key-5678";

    await saveAiSettings(
      {
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com/",
        model: "deepseek-chat",
        apiKey,
        dailyLimit: 20,
      },
      "admin-1"
    );

    const [sql, params] = vi.mocked(query).mock.calls[0];
    const ciphertext = params[4];

    expect(sql).toContain("update public.app_settings");
    expect(params.slice(0, 4)).toEqual([
      "deepseek",
      "https://api.deepseek.com",
      "deepseek-chat",
      20,
    ]);
    expect(typeof ciphertext).toBe("string");
    expect(ciphertext).not.toBe(apiKey);
    expect(decryptSecret(String(ciphertext), encryptionKey)).toBe(apiKey);
    expect(params[5]).toBe("5678");
    expect(params[6]).toBe("admin-1");
  });

  it("preserves the existing key when the input key is blank", async () => {
    await saveAiSettings(
      {
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com",
        model: "deepseek-chat",
        apiKey: "",
        dailyLimit: 10,
      },
      "admin-1"
    );

    const [sql, params] = vi.mocked(query).mock.calls[0];

    expect(sql).toContain("coalesce");
    expect(params[4]).toBeNull();
    expect(params[5]).toBeNull();
  });

  it("refuses to save when the encryption key is missing", async () => {
    vi.stubEnv("SETTINGS_ENCRYPTION_KEY", "");

    await expect(
      saveAiSettings({
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com",
        model: "deepseek-chat",
        apiKey: "sk-fake-test-key-5678",
        dailyLimit: 10,
      })
    ).rejects.toMatchObject({ code: "encryption_key_missing" });
    expect(query).not.toHaveBeenCalled();
  });

  it("refuses to save when the encryption key is not 32 bytes", async () => {
    vi.stubEnv(
      "SETTINGS_ENCRYPTION_KEY",
      Buffer.alloc(16, 1).toString("base64")
    );

    await expect(
      saveAiSettings({
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com",
        model: "deepseek-chat",
        apiKey: "",
        dailyLimit: 10,
      })
    ).rejects.toMatchObject({ code: "encryption_key_missing" });
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects non-HTTPS and unapproved provider URLs", async () => {
    await expect(
      saveAiSettings({
        provider: "custom",
        baseUrl: "http://api.deepseek.com",
        model: "model",
        apiKey: "",
        dailyLimit: 10,
      })
    ).rejects.toMatchObject({ code: "invalid_url" });

    await expect(
      saveAiSettings({
        provider: "custom",
        baseUrl: "https://not-approved.example.com/v1",
        model: "model",
        apiKey: "",
        dailyLimit: 10,
      })
    ).rejects.toMatchObject({ code: "invalid_url" });

    expect(query).not.toHaveBeenCalled();
  });

  it("allows a custom host listed in AI_ALLOWED_HOSTS", async () => {
    vi.stubEnv("AI_ALLOWED_HOSTS", "ai.example.com");

    await saveAiSettings({
      provider: "custom",
      baseUrl: "https://ai.example.com/v1/",
      model: "custom-model",
      apiKey: "",
      dailyLimit: 5,
    });

    expect(vi.mocked(query).mock.calls[0][1][1]).toBe(
      "https://ai.example.com/v1"
    );
  });

  it("fails with a safe error when the update fails", async () => {
    vi.mocked(query).mockRejectedValue(new Error("database down"));

    await expect(
      saveAiSettings({
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com",
        model: "deepseek-chat",
        apiKey: "",
        dailyLimit: 10,
      })
    ).rejects.toBeInstanceOf(AiSettingsError);
  });
});

describe("removeAiKey", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(query).mockResolvedValue(queryResult([]));
  });

  it("clears the ciphertext and hint while preserving the provider settings", async () => {
    await removeAiKey("admin-1");

    const [sql, params] = vi.mocked(query).mock.calls[0];

    expect(sql).toContain("ai_api_key_ciphertext = null");
    expect(sql).toContain("ai_api_key_hint = null");
    expect(sql).not.toContain("ai_provider =");
    expect(params).toEqual(["admin-1"]);
  });

  it("fails with a safe error when the update fails", async () => {
    vi.mocked(query).mockRejectedValue(new Error("database down"));

    await expect(removeAiKey()).rejects.toMatchObject({
      code: "remove_failed",
    });
  });
});
