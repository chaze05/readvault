import { describe, expect, it } from "vitest";

import {
  aiSettingsInputSchema,
  bookCreateSchema,
  bookmarkNoteSchema,
  bookmarkTargetSchema,
  bookUpdateSchema,
  cloudBookInputSchema,
  deleteAccountSchema,
  familyAccountInputSchema,
  favoriteInputSchema,
  hasPdfSignature,
  parseBookInput,
  passwordChangeSchema,
  passwordSchema,
  preferencesSchema,
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

describe("cloudBookInputSchema", () => {
  it("accepts a Blob-backed book record", () => {
    expect(
      cloudBookInputSchema.safeParse({
        title: "Dune",
        author: "",
        category: "",
        fileName: "dune.pdf",
        fileHash: "a".repeat(64),
        fileUrl: "https://example.blob.vercel-storage.com/dune.pdf",
      }).success
    ).toBe(true);
  });

  it("rejects an invalid hash", () => {
    expect(
      cloudBookInputSchema.safeParse({
        title: "Dune",
        fileName: "dune.pdf",
        fileHash: "not-a-hash",
        fileUrl: "https://example.blob.vercel-storage.com/dune.pdf",
      }).success
    ).toBe(false);
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

describe("passwordSchema", () => {
  it("accepts a password with at least eight characters", () => {
    expect(passwordSchema.safeParse("password").success).toBe(true);
  });

  it("rejects short passwords and passwords over 72 bytes", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("é".repeat(37)).success).toBe(false);
  });
});

describe("preferencesSchema", () => {
  it("accepts allowed PDF zoom, text size, and reduce motion", () => {
    expect(
      preferencesSchema.safeParse({
        pdfZoom: 75,
        storyTextSize: "small",
        reduceMotion: true,
      }).success
    ).toBe(true);
  });

  it("accepts every allowed zoom and text size", () => {
    for (const pdfZoom of [75, 100, 125, 150] as const) {
      for (const storyTextSize of ["small", "medium", "large"] as const) {
        expect(
          preferencesSchema.safeParse({
            pdfZoom,
            storyTextSize,
            reduceMotion: false,
          }).success
        ).toBe(true);
      }
    }
  });

  it("rejects an unsupported zoom", () => {
    expect(
      preferencesSchema.safeParse({
        pdfZoom: 90,
        storyTextSize: "small",
        reduceMotion: true,
      }).success
    ).toBe(false);
  });

  it("rejects an unsupported story text size", () => {
    expect(
      preferencesSchema.safeParse({
        pdfZoom: 100,
        storyTextSize: "huge",
        reduceMotion: false,
      }).success
    ).toBe(false);
  });
});

describe("passwordChangeSchema", () => {
  it("accepts matching new passwords", () => {
    expect(
      passwordChangeSchema.safeParse({
        currentPassword: "current-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      }).success
    ).toBe(true);
  });

  it("rejects mismatched new passwords", () => {
    expect(
      passwordChangeSchema.safeParse({
        currentPassword: "current-password",
        newPassword: "new-password",
        confirmPassword: "different-password",
      }).success
    ).toBe(false);
  });
});

describe("deleteAccountSchema", () => {
  it("accepts matching credentials and the DELETE confirmation", () => {
    expect(
      deleteAccountSchema.safeParse({
        email: "reader@example.com",
        password: "current-password",
        confirmation: "DELETE",
      }).success
    ).toBe(true);
  });

  it("rejects a missing DELETE confirmation", () => {
    expect(
      deleteAccountSchema.safeParse({
        email: "reader@example.com",
        password: "current-password",
        confirmation: "delete",
      }).success
    ).toBe(false);
  });
});

describe("familyAccountInputSchema", () => {
  it("accepts invite and temporary_password methods", () => {
    expect(
      familyAccountInputSchema.safeParse({
        email: "family@example.com",
        method: "invite",
      }).success
    ).toBe(true);
    expect(
      familyAccountInputSchema.safeParse({
        email: "family@example.com",
        method: "temporary_password",
      }).success
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      familyAccountInputSchema.safeParse({
        email: "not-an-email",
        method: "invite",
      }).success
    ).toBe(false);
  });

  it("rejects an unsupported method", () => {
    expect(
      familyAccountInputSchema.safeParse({
        email: "family@example.com",
        method: "email",
      }).success
    ).toBe(false);
  });
});

describe("bookmarkTargetSchema", () => {
  it("accepts exactly one book or story target", () => {
    expect(
      bookmarkTargetSchema.safeParse({
        bookId: crypto.randomUUID(),
        pageNumber: 3,
      }).success
    ).toBe(true);
    expect(
      bookmarkTargetSchema.safeParse({
        storyId: crypto.randomUUID(),
        pageNumber: 1,
      }).success
    ).toBe(true);
  });

  it("rejects both or neither target", () => {
    expect(
      bookmarkTargetSchema.safeParse({
        bookId: crypto.randomUUID(),
        storyId: crypto.randomUUID(),
        pageNumber: 3,
      }).success
    ).toBe(false);
    expect(bookmarkTargetSchema.safeParse({ pageNumber: 3 }).success).toBe(
      false
    );
  });

  it("rejects non-positive and fractional page numbers", () => {
    expect(
      bookmarkTargetSchema.safeParse({
        bookId: crypto.randomUUID(),
        pageNumber: 0,
      }).success
    ).toBe(false);
    expect(
      bookmarkTargetSchema.safeParse({
        bookId: crypto.randomUUID(),
        pageNumber: 1.5,
      }).success
    ).toBe(false);
  });
});

describe("bookmarkNoteSchema", () => {
  it("accepts empty and 500-character notes", () => {
    expect(bookmarkNoteSchema.safeParse({ note: "" }).success).toBe(true);
    expect(
      bookmarkNoteSchema.safeParse({ note: "x".repeat(500) }).success
    ).toBe(true);
  });

  it("rejects notes over 500 characters", () => {
    expect(
      bookmarkNoteSchema.safeParse({ note: "x".repeat(501) }).success
    ).toBe(false);
  });
});

describe("favoriteInputSchema", () => {
  it("accepts book and story favorites", () => {
    expect(
      favoriteInputSchema.safeParse({
        kind: "book",
        id: crypto.randomUUID(),
        isFavorite: true,
      }).success
    ).toBe(true);
    expect(
      favoriteInputSchema.safeParse({
        kind: "story",
        id: crypto.randomUUID(),
        isFavorite: false,
      }).success
    ).toBe(true);
  });

  it("rejects other kinds and invalid ids", () => {
    expect(
      favoriteInputSchema.safeParse({
        kind: "movie",
        id: crypto.randomUUID(),
        isFavorite: true,
      }).success
    ).toBe(false);
    expect(
      favoriteInputSchema.safeParse({
        kind: "book",
        id: "not-a-uuid",
        isFavorite: true,
      }).success
    ).toBe(false);
  });
});

describe("aiSettingsInputSchema", () => {
  it("accepts valid AI settings without an API key", () => {
    expect(
      aiSettingsInputSchema.safeParse({
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com",
        model: "deepseek-chat",
        dailyLimit: 10,
      }).success
    ).toBe(true);
  });

  it("rejects a daily limit below one", () => {
    expect(
      aiSettingsInputSchema.safeParse({
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com",
        model: "deepseek-chat",
        dailyLimit: 0,
      }).success
    ).toBe(false);
  });

  it("rejects a daily limit above one hundred", () => {
    expect(
      aiSettingsInputSchema.safeParse({
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com",
        model: "deepseek-chat",
        dailyLimit: 101,
      }).success
    ).toBe(false);
  });
});
