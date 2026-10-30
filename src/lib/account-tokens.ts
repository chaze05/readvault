import {
  accountTokenExpiry,
  generateAccountToken,
  hashAccountToken,
  type AccountTokenPurpose,
} from "./account-token-crypto";
import { query, withTransaction } from "./db";

export interface AccountTokenUser {
  userId: string;
  email: string;
}

export interface CreateAccountTokenInput {
  userId: string;
  purpose: AccountTokenPurpose;
  createdBy?: string | null;
  now?: Date;
}

export interface CreatedAccountToken {
  rawToken: string;
  expiresAt: Date;
}

export interface SetPasswordWithTokenInput {
  rawToken: string;
  purpose: AccountTokenPurpose;
  passwordHash: string;
  now?: Date;
}

export async function createAccountToken({
  userId,
  purpose,
  createdBy = null,
  now = new Date(),
}: CreateAccountTokenInput): Promise<CreatedAccountToken> {
  const rawToken = generateAccountToken();
  const expiresAt = accountTokenExpiry(purpose, now);

  await withTransaction(async (client) => {
    await client.query(
      `update public.account_tokens
       set used_at = $3
       where user_id = $1 and purpose = $2 and used_at is null`,
      [userId, purpose, now]
    );

    await client.query(
      `insert into public.account_tokens
         (user_id, purpose, token_hash, expires_at, created_by, created_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [userId, purpose, hashAccountToken(rawToken), expiresAt, createdBy, now]
    );
  });

  return { rawToken, expiresAt };
}

export async function findAccountToken(
  rawToken: string,
  purpose: AccountTokenPurpose,
  now: Date = new Date()
): Promise<AccountTokenUser | null> {
  const { rows } = await query<{ user_id: string; email: string }>(
    `select u.id as user_id, u.email
     from public.account_tokens t
     join public.users u on u.id = t.user_id
     where t.token_hash = $1
       and t.purpose = $2
       and t.used_at is null
       and t.expires_at > $3`,
    [hashAccountToken(rawToken), purpose, now]
  );

  const row = rows[0];

  return row ? { userId: row.user_id, email: row.email } : null;
}

export async function setPasswordWithToken({
  rawToken,
  purpose,
  passwordHash,
  now = new Date(),
}: SetPasswordWithTokenInput): Promise<AccountTokenUser | null> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ user_id: string; email: string }>(
      `update public.account_tokens t
       set used_at = $3
       from public.users u
       where t.token_hash = $1
         and t.purpose = $2
         and t.used_at is null
         and t.expires_at > $3
         and u.id = t.user_id
       returning u.id as user_id, u.email`,
      [hashAccountToken(rawToken), purpose, now]
    );

    const token = rows[0];
    if (!token) {
      return null;
    }

    await client.query(
      `update public.users
       set password_hash = $2,
           session_version = session_version + 1,
           must_change_password = false
       where id = $1`,
      [token.user_id, passwordHash]
    );

    await client.query(
      `update public.account_tokens
       set used_at = $3
       where user_id = $1 and purpose = $2 and used_at is null`,
      [token.user_id, purpose, now]
    );

    return { userId: token.user_id, email: token.email };
  });
}
