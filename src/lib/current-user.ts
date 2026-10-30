import { getSession } from "./session-cookies";
import { findUserById } from "./users";

export interface CurrentUser {
  id: string;
  email: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
  sessionVersion: number;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const user = await findUserById(session.userId);
  if (!user || user.session_version !== session.sessionVersion) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    isAdmin: user.is_admin,
    mustChangePassword: user.must_change_password,
    sessionVersion: user.session_version,
  };
}

export async function requireActiveUser(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();

  return user && !user.mustChangePassword ? user : null;
}

export async function requireAdmin(): Promise<CurrentUser | null> {
  const user = await requireActiveUser();

  return user?.isAdmin ? user : null;
}
