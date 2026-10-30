import { query } from "./db";

export interface AuthUser {
  id: string;
  email: string;
}

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
): Promise<(AuthUser & { password_hash: string }) | null> {
  const { rows } = await query<AuthUser & { password_hash: string }>(
    "select id, email, password_hash from public.users where lower(email) = lower($1)",
    [email]
  );

  return rows[0] ?? null;
}
