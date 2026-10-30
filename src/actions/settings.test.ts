import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/current-user", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  findPasswordHashById: vi.fn(),
  incrementSessionVersion: vi.fn(),
  updateUserPassword: vi.fn(),
}));

vi.mock("@/lib/session-cookies", () => ({
  clearSessionCookie: vi.fn(),
  setSessionCookie: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  signSession: vi.fn(),
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { clearSessionCookie } from "@/lib/session-cookies";
import { incrementSessionVersion } from "@/lib/users";

import { signOutAllAction } from "./settings";

const user = {
  id: "user-1",
  email: "person@example.com",
  isAdmin: false,
  mustChangePassword: false,
  sessionVersion: 0,
};

describe("signOutAllAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    vi.mocked(incrementSessionVersion).mockResolvedValue(1);
    vi.mocked(clearSessionCookie).mockResolvedValue(undefined);
  });

  it("increments the version before clearing the cookie and redirecting", async () => {
    await signOutAllAction();

    expect(incrementSessionVersion).toHaveBeenCalledWith("user-1");
    expect(clearSessionCookie).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/login?signout=all");
    expect(
      vi.mocked(incrementSessionVersion).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(clearSessionCookie).mock.invocationCallOrder[0]);
    expect(
      vi.mocked(clearSessionCookie).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(redirect).mock.invocationCallOrder[0]);
  });

  it("returns an error without clearing the cookie or redirecting when revocation fails", async () => {
    vi.mocked(incrementSessionVersion).mockRejectedValue(new Error("db down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await signOutAllAction();

    expect(result).toEqual({
      error: "Could not sign out all devices. Please try again.",
    });
    expect(clearSessionCookie).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
