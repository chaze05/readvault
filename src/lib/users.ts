import { query } from "./db";

export interface AuthUser {
  id: string;
  email: string;
}

export interface UserSecurityFields {
  is_admin: boolean;
  session_version: number;
  must_change_password: boolean;
}

export type UserRecord = AuthUser & UserSecurityFields;

export async function createUser(
  email: string,
  passwordHash: string
): Promise<AuthUser> {
  const { rows } = await query<AuthUser>(
    "insert into public.users (email, password_hash) values (lower($1), $2) returning id, email",
    [email, passwordHash]
  );

  return rows[0];
}

export async function findUserForLogin(
  email: string
): Promise<(UserRecord & { password_hash: string }) | null> {
  const { rows } = await query<UserRecord & { password_hash: string }>(
    "select id, email, password_hash, is_admin, session_version, must_change_password from public.users where lower(email) = lower($1)",
    [email]
  );

  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const { rows } = await query<UserRecord>(
    "select id, email, is_admin, session_version, must_change_password from public.users where id = $1",
    [id]
  );

  return rows[0] ?? null;
}

export async function findPasswordHashById(id: string): Promise<string | null> {
  const { rows } = await query<{ password_hash: string }>(
    "select password_hash from public.users where id = $1",
    [id]
  );

  return rows[0]?.password_hash ?? null;
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string
): Promise<number> {
  const { rows } = await query<{ session_version: number }>(
    `update public.users
     set password_hash = $2,
         must_change_password = false,
         session_version = session_version + 1
     where id = $1
     returning session_version`,
    [userId, passwordHash]
  );

  const row = rows[0];
  if (!row) {
    throw new Error("User not found.");
  }

  return row.session_version;
}

export async function incrementSessionVersion(
  userId: string
): Promise<number> {
  const { rows } = await query<{ session_version: number }>(
    `update public.users
     set session_version = session_version + 1
     where id = $1
     returning session_version`,
    [userId]
  );

  const row = rows[0];
  if (!row) {
    throw new Error("User not found.");
  }

  return row.session_version;
}
