import path from "node:path";

import { describe, expect, it } from "vitest";

import { createStoredName, isInsideUploads, uploadsDir } from "./storage";

describe("storage helpers", () => {
  it("creates a PDF name with a timestamp and unique id", () => {
    const name = createStoredName(1234567890, "abc-123");

    expect(name).toBe("1234567890-abc-123.pdf");
  });

  it("accepts paths inside the uploads directory", () => {
    expect(isInsideUploads(path.join(uploadsDir, "book.pdf"))).toBe(true);
  });

  it("rejects paths outside the uploads directory", () => {
    expect(isInsideUploads(path.join(uploadsDir, "..", "secret.pdf"))).toBe(false);
    expect(isInsideUploads("C:\\Windows\\win.ini")).toBe(false);
  });
});
