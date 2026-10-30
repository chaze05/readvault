import type { UserPreferences } from "./preferences";
import type { Book, BookStatus, Story, StoryStatus, StoryType } from "./types";

export const EXPORT_SCHEMA_VERSION = 1;

export interface ExportAccount {
  id: string;
  email: string;
  createdAt: string | null;
}

export interface ExportBook {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string | null;
  fileName: string | null;
  fileUrl: string | null;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  coverColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportStoryPage {
  pageNumber: number;
  content: string;
  imageUrl: string | null;
  imageAlt: string | null;
}

export interface ExportStory {
  id: string;
  title: string;
  storyType: StoryType;
  sourceTitle: string | null;
  description: string | null;
  ageRange: string | null;
  language: string;
  coverImageUrl: string | null;
  status: StoryStatus;
  pageCount: number;
  currentPage: number;
  pages: ExportStoryPage[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportDocument {
  schemaVersion: number;
  exportedAt: string;
  account: ExportAccount;
  preferences: UserPreferences;
  books: ExportBook[];
  stories: ExportStory[];
  blobUrls: string[];
}

export interface ExportSource {
  account: ExportAccount;
  preferences: UserPreferences;
  books: Book[];
  stories: Story[];
}

function exportBook(book: Book): ExportBook {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    category: book.category,
    description: book.description,
    fileName: book.fileName,
    fileUrl: book.fileUrl ?? null,
    totalPages: book.totalPages,
    currentPage: book.currentPage,
    status: book.status,
    coverColor: book.coverColor,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
}

function exportStoryPage(page: NonNullable<Story["pages"]>[number]) {
  return {
    pageNumber: page.pageNumber,
    content: page.content,
    imageUrl: page.imageUrl ?? null,
    imageAlt: page.imageAlt ?? null,
  };
}

function exportStory(story: Story): ExportStory {
  return {
    id: story.id,
    title: story.title,
    storyType: story.storyType,
    sourceTitle: story.sourceTitle,
    description: story.description,
    ageRange: story.ageRange,
    language: story.language,
    coverImageUrl: story.coverImageUrl,
    status: story.status,
    pageCount: story.pageCount,
    currentPage: story.currentPage,
    pages: (story.pages ?? []).map(exportStoryPage),
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
  };
}

export function collectBlobUrls({
  books,
  stories,
}: Pick<ExportSource, "books" | "stories">): string[] {
  const urls = new Set<string>();

  for (const book of books) {
    if (book.fileUrl) urls.add(book.fileUrl);
  }

  for (const story of stories) {
    if (story.coverImageUrl) urls.add(story.coverImageUrl);
    for (const page of story.pages ?? []) {
      if (page.imageUrl) urls.add(page.imageUrl);
    }
  }

  return [...urls];
}

export function buildExportDocument({
  account,
  preferences,
  books,
  stories,
}: ExportSource): ExportDocument {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    account: {
      id: account.id,
      email: account.email,
      createdAt: account.createdAt,
    },
    preferences: {
      pdfZoom: preferences.pdfZoom,
      storyTextSize: preferences.storyTextSize,
      reduceMotion: preferences.reduceMotion,
    },
    books: books.map(exportBook),
    stories: stories.map(exportStory),
    blobUrls: collectBlobUrls({ books, stories }),
  };
}
