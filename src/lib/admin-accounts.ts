import { randomBytes } from "node:crypto";

import { buildAccountTokenUrl } from "./app-url";
import { createAccountToken } from "./account-tokens";
import { query } from "./db";
import { hashPassword } from "./password";

export type FamilyAccountMethod = "invite" | "temporary_password";

export interface FamilyAccount {
  id: string;
  email: string;
  createdAt: Date;
  isAdmin: boolean;
}

export interface CreateFamilyAccountInput {
  email: string;
  method: FamilyAccountMethod;
  createdBy: string;
}

export type CreateFamilyAccountResult =
  | {
      method: "invite";
      account: FamilyAccount;
      inviteUrl: string;
      expiresAt: Date;
    }
  | {
      method: "temporary_password";
      account: FamilyAccount;
      temporaryPassword: string;
    };

export interface PasswordResetLink {
  email: string;
  resetUrl: string;
  expiresAt: Date;
}

export type AdminAccountErrorCode = "duplicate_email" | "account_not_found";

export class AdminAccountError extends Error {
  readonly code: AdminAccountErrorCode;

  constructor(code: AdminAccountErrorCode, message: string) {
    super(message);
    this.name = "AdminAccountError";
    this.code = code;
  }
}

interface FamilyAccountRow {
  id: string;
  email: string;
  created_at: Date;
  is_admin: boolean;
}

function mapFamilyAccount(row: FamilyAccountRow): FamilyAccount {
  return {
    id: row.id,
    email: row.email,
    createdAt: new Date(row.created_at),
    isAdmin: row.is_admin,
  };
}

function generatePassword(): string {
  return randomBytes(24).toString("base64url");
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

export async function listFamilyAccounts(): Promise<FamilyAccount[]> {
  const { rows } = await query<FamilyAccountRow>(
    `select id, email, created_at, is_admin
     from public.users
     order by created_at asc, email asc`
  );

  return rows.map(mapFamilyAccount);
}

export async function createFamilyAccount({
  email,
  method,
  createdBy,
}: CreateFamilyAccountInput): Promise<CreateFamilyAccountResult> {
  const generatedPassword = generatePassword();
  const passwordHash = await hashPassword(generatedPassword);

  let row: FamilyAccountRow;

  try {
    const { rows } = await query<FamilyAccountRow>(
      `insert into public.users (email, password_hash, must_change_password)
       values (lower($1), $2, true)
       returning id, email, created_at, is_admin`,
      [email, passwordHash]
    );

    if (!rows[0]) {
      throw new Error("Could not create the family account.");
    }

    row = rows[0];
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AdminAccountError(
        "duplicate_email",
        "An account with that email already exists."
      );
    }

    throw error;
  }

  const account = mapFamilyAccount(row);

  if (method === "invite") {
    let token: Awaited<ReturnType<typeof createAccountToken>>;

    try {
      token = await createAccountToken({
        userId: account.id,
        purpose: "account_invite",
        createdBy,
      });
    } catch (error) {
      await query("delete from public.users where id = $1", [
        account.id,
      ]).catch(() => {});
      throw error;
    }

    return {
      method,
      account,
      inviteUrl: buildAccountTokenUrl(token.rawToken, "account_invite"),
      expiresAt: token.expiresAt,
    };
  }

  return {
    method,
    account,
    temporaryPassword: generatedPassword,
  };
}

export async function createPasswordResetLink(
  email: string,
  createdBy: string
): Promise<PasswordResetLink> {
  const { rows } = await query<{ id: string; email: string }>(
    "select id, email from public.users where lower(email) = lower($1)",
    [email]
  );

  const user = rows[0];

  if (!user) {
    throw new AdminAccountError(
      "account_not_found",
      "No account found with that email address."
    );
  }

  const token = await createAccountToken({
    userId: user.id,
    purpose: "password_reset",
    createdBy,
  });

  return {
    email: user.email,
    resetUrl: buildAccountTokenUrl(token.rawToken, "password_reset"),
    expiresAt: token.expiresAt,
  };
}
