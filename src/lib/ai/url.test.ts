import { afterEach, describe, expect, it, vi } from "vitest";

import { validateAiBaseUrl } from "./url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("validateAiBaseUrl", () => {
  it("accepts the built-in provider presets", () => {
    expect(validateAiBaseUrl("https://api.deepseek.com", [])).toBe(
      "https://api.deepseek.com"
    );
    expect(validateAiBaseUrl("https://api.openai.com/v1", [])).toBe(
      "https://api.openai.com/v1"
    );
    expect(validateAiBaseUrl("https://api.deepseek.com/", [])).toBe(
      "https://api.deepseek.com"
    );
  });

  it("accepts custom hosts only when explicitly allowed", () => {
    expect(
      validateAiBaseUrl("https://ai.example.com/v1", ["ai.example.com"])
    ).toBe("https://ai.example.com/v1");
  });

  it("reads custom hosts from AI_ALLOWED_HOSTS", () => {
    vi.stubEnv("AI_ALLOWED_HOSTS", "ai.example.com, gateway.example.net");

    expect(validateAiBaseUrl("https://gateway.example.net/v1")).toBe(
      "https://gateway.example.net/v1"
    );
  });

  it("rejects plain HTTP", () => {
    expect(() => validateAiBaseUrl("http://api.deepseek.com", [])).toThrow();
  });

  it("rejects unapproved custom hosts", () => {
    expect(() => validateAiBaseUrl("https://ai.example.com", [])).toThrow();
  });

  it("rejects loopback, private, and link-local hosts", () => {
    for (const url of [
      "https://localhost",
      "https://localhost:8443/v1",
      "https://127.0.0.1",
      "https://127.1.2.3",
      "https://0.0.0.0",
      "https://10.0.0.5",
      "https://172.16.0.1",
      "https://172.31.255.255",
      "https://192.168.1.20",
      "https://169.254.169.254",
      "https://[::1]",
      "https://[fe80::1]",
      "https://[fd12:3456::1]",
      "https://[::ffff:127.0.0.1]",
    ]) {
      expect(() => validateAiBaseUrl(url, ["localhost", "127.0.0.1"])).toThrow();
    }
  });

  it("rejects provider URLs with embedded credentials", () => {
    expect(() =>
      validateAiBaseUrl("https://user:pass@api.deepseek.com", [])
    ).toThrow();
  });

  it("rejects invalid or unsupported URLs", () => {
    expect(() => validateAiBaseUrl("", [])).toThrow();
    expect(() => validateAiBaseUrl("api.deepseek.com", [])).toThrow();
    expect(() => validateAiBaseUrl("ftp://api.deepseek.com", [])).toThrow();
  });
});
