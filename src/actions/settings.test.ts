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

vi.mock("@/lib/data-export", () => ({
  deleteAllUserContent: vi.fn(),
  deleteUserAccount: vi.fn(),
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
import {
  deleteAllUserContent,
  deleteUserAccount,
} from "@/lib/data-export";
import { updatePreferences } from "@/lib/preferences";
import {
  clearSessionCookie,
  setMotionPreferenceCookie,
} from "@/lib/session-cookies";
import { incrementSessionVersion } from "@/lib/users";

import {
  deleteAccountAction,
  deleteAllContentAction,
  signOutAllAction,
  updatePreferencesAction,
} from "./settings";

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

describe("deleteAllContentAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    vi.mocked(deleteAllUserContent).mockResolvedValue({
      deletedBooks: 2,
      deletedStories: 1,
      deletedBlobs: 3,
    });
  });

  it("deletes content only after the typed confirmation matches", async () => {
    const formData = new FormData();
    formData.set("confirmation", "delete");

    const result = await deleteAllContentAction(formData);

    expect(result).toEqual({
      error: "Type DELETE to confirm deleting all of your content.",
    });
    expect(deleteAllUserContent).not.toHaveBeenCalled();
  });

  it("deletes the signed-in user's content and returns the counts", async () => {
    const formData = new FormData();
    formData.set("confirmation", "DELETE");

    const result = await deleteAllContentAction(formData);

    expect(deleteAllUserContent).toHaveBeenCalledWith("user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/library");
    expect(result).toEqual({
      ok: true,
      deletedBooks: 2,
      deletedStories: 1,
      deletedBlobs: 3,
    });
  });

  it("returns an error without success counts when Blob cleanup fails", async () => {
    vi.mocked(deleteAllUserContent).mockRejectedValue(
      new Error("Blob deletion failed")
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const formData = new FormData();
    formData.set("confirmation", "DELETE");

    const result = await deleteAllContentAction(formData);

    expect(result).toEqual({
      error:
        "Could not delete all of your content because some stored files could not be removed. Your library was not deleted.",
    });
    expect(result).not.toHaveProperty("ok");
    consoleError.mockRestore();
  });
});

describe("deleteAccountAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    vi.mocked(deleteUserAccount).mockResolvedValue({ ok: true });
  });

  it("passes the typed email, password, and confirmation to account deletion", async () => {
    const formData = new FormData();
    formData.set("email", "person@example.com");
    formData.set("password", "correct-horse");
    formData.set("confirmation", "DELETE");

    await deleteAccountAction(formData);

    expect(deleteUserAccount).toHaveBeenCalledWith("user-1", {
      email: "person@example.com",
      password: "correct-horse",
      confirmation: "DELETE",
    });
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("returns verification errors without redirecting", async () => {
    vi.mocked(deleteUserAccount).mockResolvedValue({
      error: "Current password is incorrect.",
    });
    const formData = new FormData();
    formData.set("email", "person@example.com");
    formData.set("password", "wrong");
    formData.set("confirmation", "DELETE");

    const result = await deleteAccountAction(formData);

    expect(result).toEqual({ error: "Current password is incorrect." });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not attempt deletion when there is no signed-in user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const formData = new FormData();
    formData.set("email", "person@example.com");
    formData.set("password", "correct-horse");
    formData.set("confirmation", "DELETE");

    const result = await deleteAccountAction(formData);

    expect(result).toEqual({
      error: "Your session has expired. Sign in again to continue.",
    });
    expect(deleteUserAccount).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
