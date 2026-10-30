import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "readvault-session";
const SESSION_DAYS = 30;

export interface Session {
  userId: string;
  email: string;
  sessionVersion: number;
  mustChangePassword: boolean;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters.");
  }

  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({
    email: session.email,
    sv: session.sessionVersion,
    mcp: session.mustChangePassword,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());

    if (!payload.sub || typeof payload.email !== "string") {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email,
      sessionVersion: typeof payload.sv === "number" ? payload.sv : 0,
      mustChangePassword:
        typeof payload.mcp === "boolean" ? payload.mcp : false,
    };
  } catch {
    return null;
  }
}
