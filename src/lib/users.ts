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
