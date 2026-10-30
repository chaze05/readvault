import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "./crypto";

const key = Buffer.alloc(32, 7).toString("base64");
const otherKey = Buffer.alloc(32, 9).toString("base64");

describe("AI secret crypto", () => {
  it("round-trips a secret through a versioned AES-256-GCM envelope", () => {
    const plaintext = "sk-test-fake-key-1234567890";
    const envelope = encryptSecret(plaintext, key);

    expect(envelope.startsWith("v1.")).toBe(true);
    expect(envelope).not.toContain(plaintext);
    expect(decryptSecret(envelope, key)).toBe(plaintext);
  });

  it("uses a fresh random IV for every encryption", () => {
    const first = encryptSecret("same-secret", key);
    const second = encryptSecret("same-secret", key);

    expect(first).not.toBe(second);
    expect(decryptSecret(first, key)).toBe("same-secret");
    expect(decryptSecret(second, key)).toBe("same-secret");
  });

  it("rejects tampered ciphertext", () => {
    const envelope = encryptSecret("tamper-me", key);
    const parts = envelope.split(".");
    const ciphertext = Buffer.from(parts[3], "base64url");
    ciphertext[0] ^= 1;
    parts[3] = ciphertext.toString("base64url");

    expect(() => decryptSecret(parts.join("."), key)).toThrow();
  });

  it("rejects a tampered authentication tag", () => {
    const envelope = encryptSecret("tamper-me", key);
    const parts = envelope.split(".");
    const tag = Buffer.from(parts[2], "base64url");
    tag[0] ^= 1;
    parts[2] = tag.toString("base64url");

    expect(() => decryptSecret(parts.join("."), key)).toThrow();
  });

  it("rejects the wrong key", () => {
    const envelope = encryptSecret("wrong-key", key);

    expect(() => decryptSecret(envelope, otherKey)).toThrow();
  });

  it("requires a 32-byte base64 key", () => {
    const shortKey = Buffer.alloc(16, 1).toString("base64");

    expect(() => encryptSecret("secret", shortKey)).toThrow();
    expect(() => decryptSecret(encryptSecret("secret", key), shortKey)).toThrow();
    expect(() => encryptSecret("secret", "")).toThrow();
  });

  it("rejects malformed envelopes", () => {
    expect(() => decryptSecret("not-an-envelope", key)).toThrow();
    expect(() => decryptSecret("v2.a.b.c", key)).toThrow();
  });
});
