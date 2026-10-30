import { describe, expect, it } from "vitest";

import { buildExportDocument, collectBlobUrls } from "./export-shape";
import type { Book, Story } from "./types";

const preferences = {
  pdfZoom: 125 as const,
  storyTextSize: "large" as const,
  reduceMotion: true,
};

const books: Book[] = [
  {
    id: "book-1",
    title: "The Wind in the Willows",
    author: "Kenneth Grahame",
    category: "Classics",
    description: "A riverbank adventure.",
    fileName: "willows.pdf",
    hasFile: true,
    fileUrl: "https://blob.example/books/willows.pdf",
    totalPages: 240,
    currentPage: 12,
    status: "reading",
    coverColor: "#315b45",
    createdAt: "2026-01-02T03:04:05.000Z",
    updatedAt: "2026-02-03T04:05:06.000Z",
  },
];

const stories: Story[] = [
  {
    id: "story-1",
    title: "The Moon Garden",
    storyType: "original",
    sourceTitle: null,
    description: "A small story about a night garden.",
    ageRange: "3-6",
    language: "en",
    coverImageUrl: "https://blob.example/story-images/cover.png",
    status: "published",
    pageCount: 2,
    currentPage: 1,
    pages: [
      {
        id: "page-1",
        pageNumber: 1,
        content: "Once there was a garden that only bloomed at night.",
        imageUrl: "https://blob.example/story-images/page-1.png",
        imageAlt: "A moonlit garden",
      },
      {
        id: "page-2",
        pageNumber: 2,
        content: "The fireflies came out to say hello.",
        imageUrl: null,
        imageAlt: null,
      },
    ],
    createdAt: "2026-03-04T05:06:07.000Z",
    updatedAt: "2026-04-05T06:07:08.000Z",
  },
];

const account = {
  id: "user-1",
  email: "person@example.com",
  createdAt: "2026-01-01T00:00:00.000Z",
  passwordHash: "super-secret-password-hash",
  password_hash: "super-secret-password-hash",
  token: "super-secret-token",
  sessionVersion: 3,
};

describe("buildExportDocument", () => {
  it("includes the schema version, account, preferences, books, stories, and pages", () => {
    const document = buildExportDocument({
      account,
      preferences,
      books,
      stories,
    });

    expect(document.schemaVersion).toBe(1);
    expect(new Date(document.exportedAt).toISOString()).toBe(
      document.exportedAt
    );
    expect(document.account).toEqual({
      id: "user-1",
      email: "person@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(document.preferences).toEqual({
      pdfZoom: 125,
      storyTextSize: "large",
      reduceMotion: true,
    });
    expect(document.books).toEqual([
      {
        id: "book-1",
        title: "The Wind in the Willows",
        author: "Kenneth Grahame",
        category: "Classics",
        description: "A riverbank adventure.",
        fileName: "willows.pdf",
        fileUrl: "https://blob.example/books/willows.pdf",
        totalPages: 240,
        currentPage: 12,
        status: "reading",
        coverColor: "#315b45",
        createdAt: "2026-01-02T03:04:05.000Z",
        updatedAt: "2026-02-03T04:05:06.000Z",
      },
    ]);
    expect(document.stories).toHaveLength(1);
    expect(document.stories[0]).toMatchObject({
      id: "story-1",
      title: "The Moon Garden",
      storyType: "original",
      coverImageUrl: "https://blob.example/story-images/cover.png",
      pageCount: 2,
    });
    expect(document.stories[0].pages).toEqual([
      {
        pageNumber: 1,
        content: "Once there was a garden that only bloomed at night.",
        imageUrl: "https://blob.example/story-images/page-1.png",
        imageAlt: "A moonlit garden",
      },
      {
        pageNumber: 2,
        content: "The fireflies came out to say hello.",
        imageUrl: null,
        imageAlt: null,
      },
    ]);
    expect(document.blobUrls).toEqual([
      "https://blob.example/books/willows.pdf",
      "https://blob.example/story-images/cover.png",
      "https://blob.example/story-images/page-1.png",
    ]);
  });

  it("never includes password hashes, tokens, or session data", () => {
    const document = buildExportDocument({
      account,
      preferences,
      books,
      stories,
    });
    const json = JSON.stringify(document);

    expect(json).not.toContain("super-secret-password-hash");
    expect(json).not.toContain("super-secret-token");
    expect(json).not.toContain("password");
    expect(json).not.toContain("sessionVersion");
  });

  it("treats missing story pages as an empty list", () => {
    const document = buildExportDocument({
      account,
      preferences,
      books,
      stories: [{ ...stories[0], pages: undefined }],
    });

    expect(document.stories[0].pages).toEqual([]);
    expect(document.blobUrls).toContain(
      "https://blob.example/story-images/cover.png"
    );
  });
});

describe("collectBlobUrls", () => {
  it("gathers book files, story covers, and page images without duplicates", () => {
    const urls = collectBlobUrls({
      books: [
        books[0],
        { ...books[0], id: "book-2", fileUrl: books[0].fileUrl },
      ],
      stories: [
        stories[0],
        {
          ...stories[0],
          id: "story-2",
          coverImageUrl: null,
          pages: [
            {
              id: "page-3",
              pageNumber: 1,
              content: "Another page.",
              imageUrl: "https://blob.example/story-images/page-1.png",
              imageAlt: null,
            },
          ],
        },
      ],
    });

    expect(urls).toEqual([
      "https://blob.example/books/willows.pdf",
      "https://blob.example/story-images/cover.png",
      "https://blob.example/story-images/page-1.png",
    ]);
  });

  it("ignores empty and missing URLs", () => {
    const urls = collectBlobUrls({
      books: [{ ...books[0], fileUrl: undefined }],
      stories: [
        {
          ...stories[0],
          coverImageUrl: "",
          pages: [
            {
              id: "page-1",
              pageNumber: 1,
              content: "No image.",
              imageUrl: null,
              imageAlt: null,
            },
          ],
        },
      ],
    });

    expect(urls).toEqual([]);
  });
});
