import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));

vi.mock("next/link", () => ({
  default: () => null,
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => null,
  BookOpen: () => null,
}));

vi.mock("@/lib/current-user", () => ({
  requireActiveUser: vi.fn(),
}));

vi.mock("@/lib/book-store", () => ({
  getBook: vi.fn(),
}));

vi.mock("@/lib/preferences", () => ({
  getPreferences: vi.fn(),
}));

vi.mock("@/components/pdf-reader", () => ({
  PdfReader: vi.fn(() => null),
}));

import { PdfReader } from "@/components/pdf-reader";
import { getBook } from "@/lib/book-store";
import { requireActiveUser } from "@/lib/current-user";
import { getPreferences } from "@/lib/preferences";
import type { Book } from "@/lib/types";

import ReaderPage from "./page";

const bookId = "11111111-1111-4111-8111-111111111111";

const book: Book = {
  id: bookId,
  title: "The Book",
  author: "Author Name",
  category: "Fiction",
  description: null,
  fileName: "the-book.pdf",
  hasFile: true,
  fileUrl: "https://example.invalid/the-book.pdf",
  totalPages: 5,
  currentPage: 2,
  status: "reading",
  coverColor: "#315b45",
  isFavorite: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

function findElement(node: ReactNode, type: unknown): ReactElement | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return null;
  }

  if (!isValidElement(node)) return null;
  if (node.type === type) return node as ReactElement;

  return findElement(
    (node.props as { children?: ReactNode }).children,
    type
  );
}

async function getInitialPage(page?: string): Promise<number> {
  const element = await ReaderPage({
    params: Promise.resolve({ id: bookId }),
    searchParams: Promise.resolve(page === undefined ? {} : { page }),
  });
  const pdfReader = findElement(element, PdfReader);

  expect(pdfReader).not.toBeNull();

  return (pdfReader?.props as { initialPage: number }).initialPage;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireActiveUser).mockResolvedValue({
    id: "db-user-1",
    email: "user@example.com",
    isAdmin: false,
    mustChangePassword: false,
    sessionVersion: 0,
  });
  vi.mocked(getBook).mockResolvedValue(book);
  vi.mocked(getPreferences).mockResolvedValue({
    pdfZoom: 100,
    storyTextSize: "medium",
    reduceMotion: false,
  });
});

describe("reader page query", () => {
  it.each([
    { label: "a valid page", page: "3", expected: 3 },
    { label: "the last page", page: "5", expected: 5 },
    { label: "a page above the count", page: "99", expected: 5 },
    { label: "a negative page", page: "-4", expected: 1 },
    { label: "page zero", page: "0", expected: 1 },
    { label: "a non-numeric page", page: "abc", expected: 2 },
    { label: "a decimal page", page: "3.5", expected: 2 },
    { label: "a hex page", page: "0x10", expected: 2 },
    { label: "an exponent page", page: "1e2", expected: 2 },
    { label: "an absent page", page: undefined, expected: 2 },
  ])("passes initialPage for $label", async ({ page, expected }) => {
    await expect(getInitialPage(page)).resolves.toBe(expected);
  });

  it("does not apply an upper clamp when totalPages is unknown", async () => {
    vi.mocked(getBook).mockResolvedValue({ ...book, totalPages: 0 });

    await expect(getInitialPage("99")).resolves.toBe(99);
  });
});
