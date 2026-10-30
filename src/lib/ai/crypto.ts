import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from "node:crypto";

const ENVELOPE_VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export class SecretCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecretCryptoError";
  }
}

function parseKey(keyBase64: string): Buffer {
  if (!keyBase64 || !keyBase64.trim()) {
    throw new SecretCryptoError("Encryption key is not configured.");
  }

  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== KEY_BYTES) {
    throw new SecretCryptoError("Encryption key must be 32 bytes.");
  }

  return key;
}

export function encryptSecret(plaintext: string, keyBase64: string): string {
  const key = parseKey(keyBase64);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv) as CipherGCM;

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    ENVELOPE_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(envelope: string, keyBase64: string): string {
  const key = parseKey(keyBase64);
  const parts = typeof envelope === "string" ? envelope.split(".") : [];

  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new SecretCryptoError("Encrypted secret is malformed.");
  }

  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const ciphertext = Buffer.from(parts[3], "base64url");

  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new SecretCryptoError("Encrypted secret is malformed.");
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv) as DecipherGCM;
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new SecretCryptoError("Unable to decrypt secret.");
  }
}
