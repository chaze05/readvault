"use server";

import { hashPassword, verifyPassword } from "@/lib/password";
import { signSession } from "@/lib/session";
import { clearSessionCookie, setSessionCookie } from "@/lib/session-cookies";
import { createUser, findUserForLogin } from "@/lib/users";
import { signInSchema, signUpSchema } from "@/lib/validation";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

type AuthResult = { ok: true; mustChangePassword: boolean } | { error: string };

export async function signUp(formData: FormData): Promise<AuthResult> {
  if (process.env.ALLOW_SIGNUPS !== "true") {
    return {
      error:
        "Signups are currently closed. Please sign in with your invitation account.",
    };
  }

  const parsed = signUpSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await createUser(parsed.data.email, passwordHash);
    const token = await signSession({
      userId: user.id,
      email: user.email,
      sessionVersion: 0,
      mustChangePassword: false,
    });
    await setSessionCookie(token);
    return { ok: true, mustChangePassword: false };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "An account with that email already exists." };
    }

    console.error(
      "[auth] signup failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return { error: "Could not create the account. Please try again." };
  }
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const parsed = signInSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  try {
    const user = await findUserForLogin(parsed.data.email);

    if (!user) {
      return { error: "Invalid email or password." };
    }

    const valid = await verifyPassword(parsed.data.password, user.password_hash);
    if (!valid) {
      return { error: "Invalid email or password." };
    }

    const token = await signSession({
      userId: user.id,
      email: user.email,
      sessionVersion: user.session_version,
      mustChangePassword: user.must_change_password,
    });
    await setSessionCookie(token);
    return { ok: true, mustChangePassword: user.must_change_password };
  } catch (error) {
    console.error(
      "[auth] signin failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return { error: "Could not sign in. Please try again." };
  }
}

export async function signOut(): Promise<{ ok: true }> {
  await clearSessionCookie();
  return { ok: true };
}
