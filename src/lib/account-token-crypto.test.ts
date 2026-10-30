import { describe, expect, it } from "vitest";

import {
  accountTokenExpiry,
  generateAccountToken,
  hashAccountToken,
  isAccountTokenExpired,
} from "./account-token-crypto";

describe("account token crypto", () => {
  it("generates URL-safe tokens and stores only deterministic hashes", () => {
    const raw = generateAccountToken();
    expect(raw.length).toBeGreaterThan(30);
    expect(raw).not.toMatch(/[+/=]/);
    expect(hashAccountToken(raw)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashAccountToken(raw)).toBe(hashAccountToken(raw));
  });

  it("uses one hour for resets and 24 hours for invites", () => {
    const now = new Date("2026-10-30T12:00:00.000Z");
    expect(accountTokenExpiry("password_reset", now).toISOString()).toBe(
      "2026-10-30T13:00:00.000Z"
    );
    expect(accountTokenExpiry("account_invite", now).toISOString()).toBe(
      "2026-10-31T12:00:00.000Z"
    );
    expect(isAccountTokenExpired(now, now)).toBe(true);
  });
});
