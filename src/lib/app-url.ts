import type { AccountTokenPurpose } from "./account-token-crypto";

const DEFAULT_APP_URL = "http://localhost:3000";

export function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    DEFAULT_APP_URL
  ).replace(/\/+$/, "");
}

export function buildAccountTokenUrl(
  rawToken: string,
  purpose: AccountTokenPurpose
): string {
  const path =
    purpose === "password_reset" ? "/reset-password" : "/accept-invite";

  return `${getAppUrl()}${path}?token=${encodeURIComponent(rawToken)}`;
}
