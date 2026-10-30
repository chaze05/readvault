import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

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

vi.mock("@/lib/preferences", () => ({
  updatePreferences: vi.fn(),
}));

vi.mock("@/lib/session-cookies", () => ({
  clearSessionCookie: vi.fn(),
  setMotionPreferenceCookie: vi.fn(),
  setSessionCookie: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  signSession: vi.fn(),
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { updatePreferences } from "@/lib/preferences";
import {
  clearSessionCookie,
  setMotionPreferenceCookie,
} from "@/lib/session-cookies";
import { incrementSessionVersion } from "@/lib/users";

import { signOutAllAction, updatePreferencesAction } from "./settings";

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

describe("updatePreferencesAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    vi.mocked(updatePreferences).mockResolvedValue({
      pdfZoom: 125,
      storyTextSize: "large",
      reduceMotion: true,
    });
    vi.mocked(setMotionPreferenceCookie).mockResolvedValue(undefined);
  });

  it("saves preferences for the signed-in user and applies the motion cookie", async () => {
    const formData = new FormData();
    formData.set("pdfZoom", "125");
    formData.set("storyTextSize", "large");
    formData.set("reduceMotion", "true");

    const result = await updatePreferencesAction(formData);

    expect(updatePreferences).toHaveBeenCalledWith("user-1", {
      pdfZoom: 125,
      storyTextSize: "large",
      reduceMotion: true,
    });
    expect(setMotionPreferenceCookie).toHaveBeenCalledWith(true);
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(result).toEqual({
      ok: true,
      preferences: {
        pdfZoom: 125,
        storyTextSize: "large",
        reduceMotion: true,
      },
    });
  });

  it("treats an unchecked reduce-motion field as false", async () => {
    vi.mocked(updatePreferences).mockResolvedValue({
      pdfZoom: 100,
      storyTextSize: "medium",
      reduceMotion: false,
    });
    const formData = new FormData();
    formData.set("pdfZoom", "100");
    formData.set("storyTextSize", "medium");
    formData.set("reduceMotion", "false");

    await updatePreferencesAction(formData);

    expect(updatePreferences).toHaveBeenCalledWith("user-1", {
      pdfZoom: 100,
      storyTextSize: "medium",
      reduceMotion: false,
    });
    expect(setMotionPreferenceCookie).toHaveBeenCalledWith(false);
  });

  it("does not save when there is no signed-in user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const formData = new FormData();
    formData.set("pdfZoom", "100");
    formData.set("storyTextSize", "medium");
    formData.set("reduceMotion", "false");

    const result = await updatePreferencesAction(formData);

    expect(result).toEqual({
      error: "Your session has expired. Sign in again to continue.",
    });
    expect(updatePreferences).not.toHaveBeenCalled();
    expect(setMotionPreferenceCookie).not.toHaveBeenCalled();
  });

  it("rejects zoom values outside the supported set", async () => {
    const formData = new FormData();
    formData.set("pdfZoom", "110");
    formData.set("storyTextSize", "medium");
    formData.set("reduceMotion", "false");

    const result = await updatePreferencesAction(formData);

    expect(result).toEqual({ error: "Choose valid reading preferences." });
    expect(updatePreferences).not.toHaveBeenCalled();
  });
});
