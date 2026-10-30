export type BookStatus = "not_started" | "reading" | "completed";

export type Book = {
  id: number;
  title: string;
  author: string;
  category: string;
  description: string | null;
  fileName: string | null;
  hasFile: boolean;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  coverColor: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookInput = {
  title: string;
  author: string;
  category: string;
};
