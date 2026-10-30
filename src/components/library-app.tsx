"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookCheck,
  BookOpen,
  Library,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

import { BookCover } from "@/components/book-cover";
import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";
import { UploadDialog } from "@/components/upload-dialog";
import type { Book, BookStatus } from "@/lib/types";

type Mode = "overview" | "library" | "recent";

const MODE_COPY: Record<
  Mode,
  { eyebrow: string; title: string; subtitle: string; collectionTitle: string }
> = {
  overview: {
    eyebrow: "Personal reading space",
    title: "Good morning, reader.",
    subtitle: "A little progress each day adds up to a lot.",
    collectionTitle: "Your library",
  },
  library: {
    eyebrow: "Your collection",
    title: "My Library",
    subtitle: "Find and manage the books in your collection.",
    collectionTitle: "All books",
  },
  recent: {
    eyebrow: "Your reading trail",
    title: "Recently Read",
    subtitle: "Pick up a book you have already started.",
    collectionTitle: "Recently read",
  },
};

function statusLabel(status: BookStatus) {
  if (status === "reading") return "Currently reading";
  if (status === "completed") return "Completed";
  return "Not started";
}

function progressLabel(book: Book) {
  if (book.currentPage === 0) return "Not started";
  return `Page ${book.currentPage}${book.totalPages ? ` of ${book.totalPages}` : ""}`;
}

function progressPercent(book: Book) {
  if (!book.totalPages) return null;
  return Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));
}

export function LibraryApp({ mode = "overview" }: { mode?: Mode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All books");
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBooks() {
    try {
      setError("");
      const response = await fetch("/api/books", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load your library.");
      setBooks(await response.json());
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBooks();
  }, []);

  const sourceBooks = useMemo(
    () => (mode === "recent" ? books.filter((book) => book.currentPage > 0) : books),
    [books, mode]
  );

  const categories = useMemo(
    () => [
      "All books",
      ...Array.from(new Set(sourceBooks.map((book) => book.category))).sort(),
    ],
    [sourceBooks]
  );

  const filtered = useMemo(
    () =>
      sourceBooks.filter((book) => {
        const haystack = `${book.title} ${book.author} ${book.category}`.toLowerCase();
        return (
          haystack.includes(query.toLowerCase()) &&
          (category === "All books" || book.category === category)
        );
      }),
    [sourceBooks, query, category]
  );

  const reading = books.filter((book) => book.status === "reading");
  const completed = books.filter((book) => book.status === "completed");
  const libraryProgress = books.length
    ? Math.round((completed.length / books.length) * 100)
    : 0;
  const copy = MODE_COPY[mode];

  async function deleteBook(book: Book) {
    if (!window.confirm(`Delete "${book.title}" and its uploaded PDF?`)) return;

    setError("");

    try {
      const response = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete this book.");
      await loadBooks();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this book."
      );
    }
  }

  function clearFilters() {
    setQuery("");
    setCategory("All books");
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-area">
        <div className="mobile-topbar items-center justify-between border-b border-line bg-white px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-ink no-underline"
          >
            <span className="brand-mark !h-8 !w-8 !rounded-lg">
              <BookOpen size={17} />
            </span>
            ReadVault
          </Link>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="rounded-xl bg-brand p-2.5 text-white"
            aria-label="Upload PDF"
          >
            <Upload size={17} />
          </button>
        </div>

        <div className="main-inner">
          <header className="mb-9 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
                {copy.eyebrow}
              </p>
              <h1 className="m-0 text-3xl font-bold tracking-tight text-ink">
                {copy.title}
              </h1>
              <p className="mb-0 mt-2 text-sm text-muted">{copy.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa195]"
                  size={16}
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search your library..."
                  className="w-60 rounded-xl border border-line bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-brand"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowUpload(true)}
                className="hidden items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#274a38] sm:inline-flex"
              >
                <Upload size={16} />
                <span>Upload PDF</span>
              </button>
            </div>
          </header>

          {error && (
            <div className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {mode === "overview" && (
            <>
              <section className="mb-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Total books"
                  value={books.length}
                  hint="In your collection"
                  icon={<Library size={17} />}
                />
                <StatCard
                  label="Currently reading"
                  value={reading.length}
                  hint="Pick up where you left off"
                  icon={<BookOpen size={17} />}
                />
                <StatCard
                  label="Completed"
                  value={completed.length}
                  hint="Books finished"
                  icon={<BookCheck size={17} />}
                />
                <StatCard
                  label="Library progress"
                  value={`${libraryProgress}%`}
                  hint="Completion rate"
                  icon={<Sparkles size={17} />}
                />
              </section>

              <section className="mb-10">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="m-0 text-lg font-bold">Continue reading</h2>
                    <p className="mb-0 mt-1 text-xs text-muted">
                      Your reading journey, right where you left it.
                    </p>
                  </div>
                  <Link
                    href="/library"
                    className="text-xs font-bold text-brand no-underline hover:underline"
                  >
                    View library <ArrowUpRight className="ml-1 inline" size={13} />
                  </Link>
                </div>

                {reading.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {reading.map((book) => (
                      <ContinueCard key={book.id} book={book} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#d6ded3] bg-white p-7 text-center">
                    <BookOpen className="mx-auto mb-2 text-brand" size={24} />
                    <p className="m-0 text-sm font-semibold">
                      Your reading list is waiting
                    </p>
                    <p className="mb-0 mt-1 text-xs text-muted">
                      Upload a PDF to start reading.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="m-0 text-lg font-bold">{copy.collectionTitle}</h2>
                <p className="mb-0 mt-1 text-xs text-muted">
                  {sourceBooks.length} {sourceBooks.length === 1 ? "book" : "books"} in
                  your personal collection
                </p>
              </div>
              <div className="relative sm:hidden">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa195]"
                  size={15}
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search books..."
                  className="w-44 rounded-xl border border-line bg-white py-2.5 pl-9 pr-2 text-xs outline-none"
                />
              </div>
            </div>

            {categories.length > 1 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                      category === item
                        ? "bg-brand text-white"
                        : "border border-line bg-white text-muted hover:border-brand hover:text-brand"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="py-16 text-center text-sm text-muted">
                Loading your library...
              </div>
            ) : filtered.length ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {filtered.map((book) => (
                  <BookCard key={book.id} book={book} onDelete={deleteBook} />
                ))}
              </div>
            ) : (
              <EmptyCollection
                mode={mode}
                hasBooks={sourceBooks.length > 0}
                onUpload={() => setShowUpload(true)}
                onClearFilters={clearFilters}
              />
            )}
          </section>

          <footer className="mt-14 border-t border-line pt-5 text-center text-[11px] text-[#9aa195]">
            ReadVault · Your personal digital library
          </footer>
        </div>
      </main>

      {showUpload && (
        <UploadDialog
          onClose={() => setShowUpload(false)}
          onUploaded={() => void loadBooks()}
        />
      )}
      <MobileNav />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat-card">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted">{label}</span>
        <span className="rounded-lg bg-brand-soft p-2 text-brand">{icon}</span>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <p className="mb-0 mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

function ContinueCard({ book }: { book: Book }) {
  const percent = progressPercent(book);
  const barWidth = percent ?? 14;

  return (
    <div className="flex gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft">
      <div className="w-24 shrink-0">
        <BookCover
          title={book.title}
          author={book.author}
          color={book.coverColor}
          compact
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
          {book.category}
        </span>
        <h3 className="mb-1 mt-2 text-base font-bold">{book.title}</h3>
        <p className="m-0 text-xs text-muted">{book.author}</p>
        <div className="mt-4 flex items-center justify-between text-[11px] text-muted">
          <span>{progressLabel(book)}</span>
          <span>{percent === null ? "In progress" : `${percent}%`}</span>
        </div>
        <div className="progress-track mt-2">
          <div className="progress-fill" style={{ width: `${barWidth}%` }} />
        </div>
        <Link
          href={`/reader/${book.id}`}
          className="mt-3 text-xs font-bold text-brand no-underline"
        >
          Continue reading →
        </Link>
      </div>
    </div>
  );
}

function BookCard({
  book,
  onDelete,
}: {
  book: Book;
  onDelete: (book: Book) => void;
}) {
  return (
    <article className="book-card group overflow-hidden rounded-2xl border border-line bg-white p-3 shadow-[0_3px_14px_rgba(31,47,34,.025)]">
      <Link href={`/reader/${book.id}`} className="block no-underline">
        <BookCover title={book.title} author={book.author} color={book.coverColor} />
        <div className="px-1 pb-1 pt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-brand">
              {book.category}
            </span>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                background:
                  book.status === "reading"
                    ? "#6c9b72"
                    : book.status === "completed"
                      ? "#8d9c67"
                      : "#d4d9d0",
              }}
            />
          </div>
          <h3 className="mb-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-ink">
            {book.title}
          </h3>
          <p className="m-0 truncate text-[11px] text-muted">{book.author}</p>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="text-[10px] text-muted">{statusLabel(book.status)}</span>
            <ArrowUpRight size={14} className="text-muted" />
          </div>
        </div>
      </Link>
      <div className="mt-1 flex justify-end">
        <button
          type="button"
          onClick={() => onDelete(book)}
          className="rounded-lg p-1.5 text-[#a0a69b] opacity-70 hover:bg-red-50 hover:text-red-600"
          title="Delete book"
          aria-label={`Delete ${book.title}`}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </article>
  );
}

function EmptyCollection({
  mode,
  hasBooks,
  onUpload,
  onClearFilters,
}: {
  mode: Mode;
  hasBooks: boolean;
  onUpload: () => void;
  onClearFilters: () => void;
}) {
  if (hasBooks) {
    return (
      <div className="rounded-2xl border border-dashed border-[#d6ded3] bg-white px-5 py-14 text-center">
        <BookOpen className="mx-auto mb-3 text-brand" size={28} />
        <h3 className="m-0 text-base font-bold">No matching books</h3>
        <p className="mb-4 mt-2 text-sm text-muted">
          Try a different search or category.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-brand hover:bg-paper"
        >
          Clear filters
        </button>
      </div>
    );
  }

  if (mode === "recent") {
    return (
      <div className="rounded-2xl border border-dashed border-[#d6ded3] bg-white px-5 py-14 text-center">
        <BookOpen className="mx-auto mb-3 text-brand" size={28} />
        <h3 className="m-0 text-base font-bold">No recent books yet</h3>
        <p className="mb-4 mt-2 text-sm text-muted">
          Open a book from your library and it will appear here.
        </p>
        <Link
          href="/library"
          className="inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-[#274a38]"
        >
          Browse library
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-[#d6ded3] bg-white px-5 py-14 text-center">
      <BookOpen className="mx-auto mb-3 text-brand" size={28} />
      <h3 className="m-0 text-base font-bold">Your library is empty</h3>
      <p className="mb-4 mt-2 text-sm text-muted">
        Upload your first PDF and build your personal reading space.
      </p>
      <button
        type="button"
        onClick={onUpload}
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#274a38]"
      >
        <Upload size={15} /> Upload your first book
      </button>
    </div>
  );
}
