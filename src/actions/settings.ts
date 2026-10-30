"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  updatePreferences,
  type UserPreferences,
} from "@/lib/preferences";
import { signSession } from "@/lib/session";
import {
  clearSessionCookie,
  setMotionPreferenceCookie,
  setSessionCookie,
} from "@/lib/session-cookies";
import {
  findPasswordHashById,
  incrementSessionVersion,
  updateUserPassword,
} from "@/lib/users";
import { passwordChangeSchema, preferencesSchema } from "@/lib/validation";

const SESSION_EXPIRED_ERROR =
  "Your session has expired. Sign in again to continue.";
const UPDATE_FAILED_ERROR =
  "Could not update your password. Please try again.";
const SIGN_OUT_ALL_FAILED_ERROR =
  "Could not sign out all devices. Please try again.";
const PREFERENCES_UPDATE_FAILED_ERROR =
  "Could not save your reading preferences. Please try again.";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

type UpdatePreferencesResult =
  | { ok: true; preferences: UserPreferences }
  | { error: string };

export async function updatePreferencesAction(
  formData: FormData
): Promise<UpdatePreferencesResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: SESSION_EXPIRED_ERROR };
  }

  const reduceMotion = formString(formData, "reduceMotion");
  const parsed = preferencesSchema.safeParse({
    pdfZoom: Number(formString(formData, "pdfZoom")),
    storyTextSize: formString(formData, "storyTextSize"),
    reduceMotion: reduceMotion === "true" || reduceMotion === "on",
  });

  if (!parsed.success) {
    return { error: "Choose valid reading preferences." };
  }

  try {
    const preferences = await updatePreferences(user.id, parsed.data);
    await setMotionPreferenceCookie(preferences.reduceMotion);
    revalidatePath("/settings");
    return { ok: true, preferences };
  } catch (error) {
    console.error(
      "[settings] preferences update failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return { error: PREFERENCES_UPDATE_FAILED_ERROR };
  }
}

type ChangePasswordResult = { ok: true } | { error: string };

export async function changePasswordAction(
  formData: FormData
): Promise<ChangePasswordResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: SESSION_EXPIRED_ERROR };
  }

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formString(formData, "currentPassword"),
    newPassword: formString(formData, "newPassword"),
    confirmPassword: formString(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const passwordHash = await findPasswordHashById(user.id);

    if (!passwordHash) {
      return { error: SESSION_EXPIRED_ERROR };
    }

    const valid = await verifyPassword(
      parsed.data.currentPassword,
      passwordHash
    );

    if (!valid) {
      return { error: "Current password is incorrect." };
    }

    const newPasswordHash = await hashPassword(parsed.data.newPassword);
    const sessionVersion = await updateUserPassword(user.id, newPasswordHash);
    const token = await signSession({
      userId: user.id,
      email: user.email,
      sessionVersion,
      mustChangePassword: false,
    });

    await setSessionCookie(token);
    return { ok: true };
  } catch (error) {
    console.error(
      "[settings] password change failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return { error: UPDATE_FAILED_ERROR };
  }
}

type SignOutAllResult = { ok: true } | { error: string };

export async function signOutAllAction(): Promise<SignOutAllResult> {
  const user = await getCurrentUser();

  if (user) {
    try {
      await incrementSessionVersion(user.id);
    } catch (error) {
      console.error(
        "[settings] sign out all failed:",
        error instanceof Error ? error.message : "unknown error"
      );
      return { error: SIGN_OUT_ALL_FAILED_ERROR };
    }
  }

  await clearSessionCookie();
  redirect("/login?signout=all");
}
