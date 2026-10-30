import { createHash, randomBytes } from "node:crypto";

export type AccountTokenPurpose = "password_reset" | "account_invite";

const TOKEN_TTL_MS: Record<AccountTokenPurpose, number> = {
  password_reset: 60 * 60 * 1000,
  account_invite: 24 * 60 * 60 * 1000,
};

export function generateAccountToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAccountToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function accountTokenExpiry(
  purpose: AccountTokenPurpose,
  now: Date = new Date()
): Date {
  return new Date(now.getTime() + TOKEN_TTL_MS[purpose]);
}

export function isAccountTokenExpired(
  expiresAt: Date,
  now: Date = new Date()
): boolean {
  return expiresAt.getTime() <= now.getTime();
}
