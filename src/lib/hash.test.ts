import { describe, expect, it } from "vitest";

import { sha256 } from "./hash";

describe("sha256", () => {
  it("returns the known SHA-256 for a buffer", () => {
    expect(sha256(new TextEncoder().encode("hello"))).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("is stable for the same content", () => {
    const content = new TextEncoder().encode("%PDF-1.7 test");

    expect(sha256(content)).toBe(sha256(content));
  });
});
