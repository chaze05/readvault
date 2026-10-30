"use server";

import { redirect } from "next/navigation";

import type { AccountTokenPurpose } from "@/lib/account-token-crypto";
import { setPasswordWithToken } from "@/lib/account-tokens";
import { hashPassword } from "@/lib/password";
import { clearSessionCookie } from "@/lib/session-cookies";
import { passwordSchema } from "@/lib/validation";

const INVALID_LINK_ERROR =
  "This link is invalid or has expired. Ask an administrator for a new link.";
const UPDATE_FAILED_ERROR =
  "Could not update the password. Please try again.";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parsePurpose(value: string): AccountTokenPurpose | null {
  return value === "password_reset" || value === "account_invite"
    ? value
    : null;
}

export async function setPasswordWithTokenAction(
  formData: FormData
): Promise<{ error: string }> {
  const token = formString(formData, "token").trim();
  const purpose = parsePurpose(formString(formData, "purpose"));
  const password = formString(formData, "password");
  const confirmPassword = formString(formData, "confirmPassword");

  if (!token || !purpose) {
    return { error: INVALID_LINK_ERROR };
  }

  const parsed = passwordSchema.safeParse(password);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Enter a valid password.",
    };
  }

  if (parsed.data !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  try {
    const passwordHash = await hashPassword(parsed.data);
    const account = await setPasswordWithToken({
      rawToken: token,
      purpose,
      passwordHash,
    });

    if (!account) {
      return { error: INVALID_LINK_ERROR };
    }
  } catch (error) {
    console.error(
      "[account-tokens] password update failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return { error: UPDATE_FAILED_ERROR };
  }

  await clearSessionCookie();
  redirect("/login?reset=1");
}
