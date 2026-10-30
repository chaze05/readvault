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

vi.mock("@/lib/current-user", () => ({
  requireActiveUser: vi.fn(),
}));

vi.mock("@/lib/story-store", () => ({
  getStory: vi.fn(),
}));

vi.mock("@/lib/preferences", () => ({
  getPreferences: vi.fn(),
}));

vi.mock("@/components/story-reader", () => ({
  StoryReader: vi.fn(() => null),
}));

import { StoryReader } from "@/components/story-reader";
import { requireActiveUser } from "@/lib/current-user";
import { getPreferences } from "@/lib/preferences";
import { getStory } from "@/lib/story-store";
import type { Story } from "@/lib/types";

import ReadStoryPage from "./page";

const storyId = "22222222-2222-4222-8222-222222222222";

const story: Story = {
  id: storyId,
  title: "The Story",
  storyType: "original",
  sourceTitle: null,
  description: null,
  ageRange: null,
  language: "en",
  coverImageUrl: null,
  status: "published",
  pageCount: 4,
  currentPage: 2,
  isFavorite: false,
  pages: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      pageNumber: 1,
      content: "Page one.",
      imageUrl: null,
      imageAlt: null,
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      pageNumber: 2,
      content: "Page two.",
      imageUrl: null,
      imageAlt: null,
    },
    {
      id: "55555555-5555-4555-8555-555555555555",
      pageNumber: 3,
      content: "Page three.",
      imageUrl: null,
      imageAlt: null,
    },
    {
      id: "66666666-6666-4666-8666-666666666666",
      pageNumber: 4,
      content: "Page four.",
      imageUrl: null,
      imageAlt: null,
    },
  ],
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

async function getInitialPage(page?: string): Promise<number | undefined> {
  const element = await ReadStoryPage({
    params: Promise.resolve({ id: storyId }),
    searchParams: Promise.resolve(page === undefined ? {} : { page }),
  });
  const storyReader = findElement(element, StoryReader);

  expect(storyReader).not.toBeNull();

  return (storyReader?.props as { initialPage?: number }).initialPage;
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
  vi.mocked(getStory).mockResolvedValue(story);
  vi.mocked(getPreferences).mockResolvedValue({
    pdfZoom: 100,
    storyTextSize: "medium",
    reduceMotion: false,
  });
});

describe("story reader page query", () => {
  it.each([
    { label: "a valid page", page: "2", expected: 2 },
    { label: "the last page", page: "4", expected: 4 },
    { label: "a page above the count", page: "99", expected: 4 },
    { label: "a negative page", page: "-4", expected: 1 },
    { label: "page zero", page: "0", expected: 1 },
    { label: "a non-numeric page", page: "abc", expected: undefined },
    { label: "a decimal page", page: "3.5", expected: undefined },
    { label: "a hex page", page: "0x10", expected: undefined },
    { label: "an exponent page", page: "1e2", expected: undefined },
    { label: "an absent page", page: undefined, expected: undefined },
  ])("passes initialPage for $label", async ({ page, expected }) => {
    await expect(getInitialPage(page)).resolves.toBe(expected);
  });

  it("does not apply an upper clamp when the story has no pages", async () => {
    vi.mocked(getStory).mockResolvedValue({
      ...story,
      pageCount: 0,
      pages: [],
    });

    await expect(getInitialPage("99")).resolves.toBe(99);
    await expect(getInitialPage("0")).resolves.toBe(1);
  });
});
