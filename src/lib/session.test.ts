import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { signSession, verifySession } from "./session";

beforeAll(() => {
  process.env.AUTH_SECRET = "x".repeat(32);
});

describe("session claims", () => {
  it("round-trips the session version and must-change flag", async () => {
    const token = await signSession({
      userId: "user-1",
      email: "reader@example.com",
      sessionVersion: 7,
      mustChangePassword: true,
    });

    await expect(verifySession(token)).resolves.toEqual({
      userId: "user-1",
      email: "reader@example.com",
      sessionVersion: 7,
      mustChangePassword: true,
    });
  });

  it("defaults missing claims for older tokens", async () => {
    const token = await new SignJWT({ email: "reader@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-2")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("x".repeat(32)));

    await expect(verifySession(token)).resolves.toEqual({
      userId: "user-2",
      email: "reader@example.com",
      sessionVersion: 0,
      mustChangePassword: false,
    });
  });
});
