import { describe, expect, it } from "vitest";

import {
  bookCreateSchema,
  bookUpdateSchema,
  hasPdfSignature,
  parseBookInput,
  progressSchema,
} from "./validation";

describe("bookCreateSchema", () => {
  it("trims the title and defaults author and category", () => {
    const parsed = bookCreateSchema.parse({ title: "  Dune  " });

    expect(parsed.title).toBe("Dune");
    expect(parsed.author).toBe("Unknown author");
    expect(parsed.category).toBe("Uncategorized");
  });

  it("rejects an empty title", () => {
    expect(bookCreateSchema.safeParse({ title: "   " }).success).toBe(false);
  });

  it("rejects a title over 300 characters", () => {
    expect(
      bookCreateSchema.safeParse({ title: "x".repeat(301) }).success
    ).toBe(false);
  });
});

describe("parseBookInput", () => {
  it("parses FormData with defaults", () => {
    const formData = new FormData();
    formData.set("title", "  Dune ");

    const result = parseBookInput(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Dune");
      expect(result.data.author).toBe("Unknown author");
      expect(result.data.category).toBe("Uncategorized");
    }
  });

  it("returns an error for an empty title", () => {
    const formData = new FormData();
    formData.set("title", " ");

    const result = parseBookInput(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Title is required.");
    }
  });
});

describe("bookUpdateSchema", () => {
  it("accepts a partial-friendly full update and trims values", () => {
    const parsed = bookUpdateSchema.parse({
      title: "  Dune Messiah ",
      author: " Frank Herbert ",
      category: " Fiction ",
    });

    expect(parsed).toEqual({
      title: "Dune Messiah",
      author: "Frank Herbert",
      category: "Fiction",
    });
  });
});

describe("progressSchema", () => {
  it("accepts zero and a total page count", () => {
    expect(
      progressSchema.safeParse({ currentPage: 0, totalPages: 0 }).success
    ).toBe(true);
    expect(
      progressSchema.safeParse({ currentPage: 12, totalPages: 300 }).success
    ).toBe(true);
  });

  it("rejects negative and fractional pages", () => {
    expect(progressSchema.safeParse({ currentPage: -1 }).success).toBe(false);
    expect(progressSchema.safeParse({ currentPage: 1.5 }).success).toBe(false);
  });
});

describe("hasPdfSignature", () => {
  it("accepts a PDF header", () => {
    expect(hasPdfSignature(new TextEncoder().encode("%PDF-1.7"))).toBe(true);
  });

  it("rejects non-PDF content and short buffers", () => {
    expect(hasPdfSignature(new TextEncoder().encode("hello"))).toBe(false);
    expect(hasPdfSignature(new TextEncoder().encode("%PD"))).toBe(false);
  });
});
