import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/account-tokens", () => ({
  findAccountToken: vi.fn(),
  setPasswordWithToken: vi.fn(),
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn(),
}));

vi.mock("@/lib/session-cookies", () => ({
  clearSessionCookie: vi.fn(),
}));

import { redirect } from "next/navigation";

import { findAccountToken, setPasswordWithToken } from "@/lib/account-tokens";
import { hashPassword } from "@/lib/password";
import { clearSessionCookie } from "@/lib/session-cookies";

import { setPasswordWithTokenAction } from "./account-tokens";

const INVALID_LINK_ERROR =
  "This link is invalid or has expired. Ask an administrator for a new link.";
const account = { userId: "user-1", email: "person@example.com" };

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const values = {
    token: "valid-token",
    purpose: "password_reset",
    password: "long-enough-password",
    confirmPassword: "long-enough-password",
    ...overrides,
  };
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("setPasswordWithTokenAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(findAccountToken).mockResolvedValue(account);
    vi.mocked(setPasswordWithToken).mockResolvedValue(account);
    vi.mocked(hashPassword).mockResolvedValue("hashed-password");
    vi.mocked(clearSessionCookie).mockResolvedValue(undefined);
  });

  it("rejects an invalid token before running bcrypt", async () => {
    vi.mocked(findAccountToken).mockResolvedValue(null);

    const result = await setPasswordWithTokenAction(buildFormData());

    expect(result).toEqual({ error: INVALID_LINK_ERROR });
    expect(findAccountToken).toHaveBeenCalledWith("valid-token", "password_reset");
    expect(hashPassword).not.toHaveBeenCalled();
    expect(setPasswordWithToken).not.toHaveBeenCalled();
    expect(clearSessionCookie).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns the generic error when the token is consumed after the pre-check", async () => {
    vi.mocked(setPasswordWithToken).mockResolvedValue(null);

    const result = await setPasswordWithTokenAction(buildFormData());

    expect(result).toEqual({ error: INVALID_LINK_ERROR });
    expect(hashPassword).toHaveBeenCalledOnce();
    expect(setPasswordWithToken).toHaveBeenCalledOnce();
    expect(clearSessionCookie).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("clears the session cookie before redirecting after a successful update", async () => {
    await setPasswordWithTokenAction(buildFormData());

    expect(findAccountToken).toHaveBeenCalledWith("valid-token", "password_reset");
    expect(hashPassword).toHaveBeenCalledWith("long-enough-password");
    expect(setPasswordWithToken).toHaveBeenCalledWith({
      rawToken: "valid-token",
      purpose: "password_reset",
      passwordHash: "hashed-password",
    });
    expect(clearSessionCookie).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/login?reset=1");
    expect(
      vi.mocked(clearSessionCookie).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(redirect).mock.invocationCallOrder[0]);
  });

  it("rejects mismatched passwords before token lookup or hashing", async () => {
    const result = await setPasswordWithTokenAction(
      buildFormData({ confirmPassword: "different-password" })
    );

    expect(result).toEqual({ error: "Passwords do not match." });
    expect(findAccountToken).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(setPasswordWithToken).not.toHaveBeenCalled();
  });

  it("rejects an unsupported purpose without a database lookup", async () => {
    const result = await setPasswordWithTokenAction(
      buildFormData({ purpose: "something_else" })
    );

    expect(result).toEqual({ error: INVALID_LINK_ERROR });
    expect(findAccountToken).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
  });
});
