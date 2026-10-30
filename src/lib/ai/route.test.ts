import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/current-user", () => ({
  requireActiveUser: vi.fn(),
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

vi.mock("@/lib/ai/usage", () => ({
  reserveAiDraft: vi.fn(),
  refundAiDraft: vi.fn(),
}));

vi.mock("@/lib/ai/provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./provider")>();
  return {
    ...actual,
    generateAiStory: vi.fn(),
  };
});

import { NextRequest } from "next/server";

import { POST } from "@/app/api/ai/story/route";
import { resolveAiConfig } from "@/lib/ai/config";
import {
  AiProviderError,
  generateAiStory,
} from "@/lib/ai/provider";
import { refundAiDraft, reserveAiDraft } from "@/lib/ai/usage";
import { requireActiveUser } from "@/lib/current-user";

const config = {
  provider: "deepseek" as const,
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-chat",
  apiKey: "fake-test-key",
  dailyLimit: 10,
  source: "database" as const,
};

const resetAt = new Date("2026-10-31T00:00:00.000Z");

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/ai/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "",
      idea: "A shy little fox learns to ask for help.",
      storyType: "original",
      sourceTitle: "",
      ageRange: "Ages 6-8",
    }),
  });
}

describe("AI story route refunds", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireActiveUser).mockResolvedValue({
      id: "db-user-1",
      email: "user@example.com",
      isAdmin: false,
      mustChangePassword: false,
      sessionVersion: 0,
    });
    vi.mocked(resolveAiConfig).mockResolvedValue(config);
    vi.mocked(reserveAiDraft).mockResolvedValue({
      allowed: true,
      used: 1,
      limit: 10,
      resetAt,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["connection_failed", "provider_rejected"] as const)(
    "refunds definitive %s failures with the reservation timestamp",
    async (code) => {
      vi.mocked(generateAiStory).mockRejectedValue(
        new AiProviderError(code, "safe provider error")
      );

      const response = await POST(makeRequest());

      expect(response.status).toBe(502);
      expect(refundAiDraft).toHaveBeenCalledTimes(1);

      const [refundUserId, refundNow] = vi.mocked(refundAiDraft).mock.calls[0];
      const [reserveUserId, , reserveNow] =
        vi.mocked(reserveAiDraft).mock.calls[0];

      expect(refundUserId).toBe("db-user-1");
      expect(refundUserId).toBe(reserveUserId);
      expect(refundNow).toBe(reserveNow);
    }
  );

  it.each(["timeout", "invalid_response"] as const)(
    "keeps the reservation for %s outcomes",
    async (code) => {
      vi.mocked(generateAiStory).mockRejectedValue(
        new AiProviderError(code, "safe provider error")
      );

      const response = await POST(makeRequest());

      expect(response.status).toBe(502);
      expect(refundAiDraft).not.toHaveBeenCalled();
    }
  );

  it("logs a safe code when the refund fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.mocked(generateAiStory).mockRejectedValue(
      new AiProviderError("provider_rejected", "safe provider error")
    );
    vi.mocked(refundAiDraft).mockRejectedValue(new Error("database down"));

    const response = await POST(makeRequest());

    expect(response.status).toBe(502);
    expect(consoleError).toHaveBeenCalledWith(
      "[ai-story] usage refund failed: refund_failed"
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "fake-test-key"
    );
  });
});
