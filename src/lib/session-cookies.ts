import { cookies } from "next/headers";

import { SESSION_COOKIE, verifySession, type Session } from "./session";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const MOTION_COOKIE = "readvault-motion";
const MOTION_MAX_AGE = 365 * 24 * 60 * 60;

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getMotionPreference(): Promise<boolean> {
  return (await cookies()).get(MOTION_COOKIE)?.value === "1";
}

export async function setMotionPreferenceCookie(
  reduceMotion: boolean
): Promise<void> {
  (await cookies()).set(MOTION_COOKIE, reduceMotion ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MOTION_MAX_AGE,
  });
}
