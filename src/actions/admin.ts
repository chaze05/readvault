"use server";

import { revalidatePath } from "next/cache";

import {
  AdminAccountError,
  createFamilyAccount,
  createPasswordResetLink,
} from "@/lib/admin-accounts";
import { requireAdmin } from "@/lib/current-user";
import { familyAccountInputSchema } from "@/lib/validation";

const ADMIN_REQUIRED_ERROR =
  "Only administrators can manage family accounts.";
const CREATE_FAILED_ERROR =
  "Could not create the account. Please try again.";
const DUPLICATE_EMAIL_ERROR =
  "An account with that email already exists.";
const RESET_FAILED_ERROR =
  "Could not create a reset link. Please try again.";
const RESET_NOT_FOUND_ERROR =
  "No account found with that email address.";
const INVALID_INPUT_ERROR = "Enter a valid email address.";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

type CreateFamilyAccountActionResult =
  | {
      ok: true;
      method: "invite";
      email: string;
      inviteUrl: string;
    }
  | {
      ok: true;
      method: "temporary_password";
      email: string;
      temporaryPassword: string;
    }
  | { error: string };

export async function createFamilyAccountAction(
  formData: FormData
): Promise<CreateFamilyAccountActionResult> {
  const admin = await requireAdmin();

  if (!admin) {
    return { error: ADMIN_REQUIRED_ERROR };
  }

  const parsed = familyAccountInputSchema.safeParse({
    email: formString(formData, "email"),
    method: formString(formData, "method"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? INVALID_INPUT_ERROR,
    };
  }

  let result: Awaited<ReturnType<typeof createFamilyAccount>>;

  try {
    result = await createFamilyAccount({
      email: parsed.data.email,
      method: parsed.data.method,
      createdBy: admin.id,
    });
  } catch (error) {
    if (error instanceof AdminAccountError) {
      return {
        error:
          error.code === "duplicate_email"
            ? DUPLICATE_EMAIL_ERROR
            : CREATE_FAILED_ERROR,
      };
    }

    console.error(
      "[admin] family account creation failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return { error: CREATE_FAILED_ERROR };
  }

  try {
    revalidatePath("/settings");
  } catch (error) {
    console.error(
      "[admin] settings revalidation failed:",
      error instanceof Error ? error.message : "unknown error"
    );
  }

  if (result.method === "invite") {
    return {
      ok: true,
      method: result.method,
      email: result.account.email,
      inviteUrl: result.inviteUrl,
    };
  }

  return {
    ok: true,
    method: result.method,
    email: result.account.email,
    temporaryPassword: result.temporaryPassword,
  };
}

type GenerateResetLinkActionResult =
  | { ok: true; email: string; resetUrl: string }
  | { error: string };

export async function generateResetLinkAction(
  formData: FormData
): Promise<GenerateResetLinkActionResult> {
  const admin = await requireAdmin();

  if (!admin) {
    return { error: ADMIN_REQUIRED_ERROR };
  }

  const parsedEmail = familyAccountInputSchema.shape.email.safeParse(
    formString(formData, "email")
  );

  if (!parsedEmail.success) {
    return {
      error: parsedEmail.error.issues[0]?.message ?? INVALID_INPUT_ERROR,
    };
  }

  try {
    const result = await createPasswordResetLink(
      parsedEmail.data,
      admin.id
    );

    return {
      ok: true,
      email: result.email,
      resetUrl: result.resetUrl,
    };
  } catch (error) {
    if (
      error instanceof AdminAccountError &&
      error.code === "account_not_found"
    ) {
      return { error: RESET_NOT_FOUND_ERROR };
    }

    console.error(
      "[admin] reset link creation failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return { error: RESET_FAILED_ERROR };
  }
}
