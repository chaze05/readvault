export type BookStatus = "not_started" | "reading" | "completed";

export type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string | null;
  fileName: string | null;
  hasFile: boolean;
  fileUrl?: string;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  coverColor: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StoryType = "original" | "movie_inspired";
export type StoryStatus = "draft" | "published";

export type StoryPage = {
  id: string;
  pageNumber: number;
  content: string;
  imageUrl: string | null;
  imageAlt: string | null;
};

export type Story = {
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
  isFavorite: boolean;
  pages?: StoryPage[];
  createdAt: string;
  updatedAt: string;
};

export type BookmarkKind = "book" | "story";

export type BookmarkTarget = {
  kind: BookmarkKind;
  id: string;
  pageNumber: number;
};

export type BookmarkItem = {
  id: string;
  kind: BookmarkKind;
  targetId: string;
  title: string;
  pageNumber: number;
  note: string;
  pageCount: number;
  author: string;
  coverColor: string;
  coverImageUrl: string;
  createdAt: string;
  updatedAt: string;
};
