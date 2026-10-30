import { describe, expect, it } from "vitest";

import { AiProviderError, shouldRefundAiDraft } from "./provider";

describe("shouldRefundAiDraft", () => {
  it("refunds definitive provider failures", () => {
    expect(
      shouldRefundAiDraft(new AiProviderError("connection_failed", "safe"))
    ).toBe(true);
    expect(
      shouldRefundAiDraft(new AiProviderError("provider_rejected", "safe"))
    ).toBe(true);
  });

  it("keeps the reservation for ambiguous or unusable provider outcomes", () => {
    expect(shouldRefundAiDraft(new AiProviderError("timeout", "safe"))).toBe(
      false
    );
    expect(
      shouldRefundAiDraft(new AiProviderError("invalid_response", "safe"))
    ).toBe(false);
    expect(shouldRefundAiDraft(new Error("unexpected"))).toBe(false);
  });
});
