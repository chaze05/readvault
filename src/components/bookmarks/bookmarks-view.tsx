/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  Heart,
  Library,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { BookCover } from "@/components/book-cover";
import { BookmarkCard } from "@/components/bookmarks/bookmark-card";
import type { Book, BookmarkItem, Story } from "@/lib/types";

type Tab = "pages" | "favorites";

type FavoriteEntry =
  | { kind: "book"; book: Book }
  | { kind: "story"; story: Story };

function favoriteKey(entry: FavoriteEntry) {
  return `${entry.kind}:${entry.kind === "book" ? entry.book.id : entry.story.id}`;
}

function favoriteUpdatedAt(entry: FavoriteEntry) {
  const value =
    entry.kind === "book" ? entry.book.updatedAt : entry.story.updatedAt;
  return Date.parse(value) || 0;
}

export function BookmarksView({
  initialBookmarks,
  initialBooks,
  initialStories,
}: {
  initialBookmarks: BookmarkItem[];
  initialBooks: Book[];
  initialStories: Story[];
}) {
  const [tab, setTab] = useState<Tab>("pages");
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [books, setBooks] = useState(initialBooks);
  const [stories, setStories] = useState(initialStories);
  const [pendingFavorite, setPendingFavorite] = useState<string | null>(null);
  const [error, setError] = useState("");

  const favorites = useMemo<FavoriteEntry[]>(() => {
    const entries: FavoriteEntry[] = [
      ...books
        .filter((book) => book.isFavorite)
        .map((book) => ({ kind: "book" as const, book })),
      ...stories
        .filter((story) => story.isFavorite)
        .map((story) => ({ kind: "story" as const, story })),
    ];

    return entries.sort(
      (left, right) => favoriteUpdatedAt(right) - favoriteUpdatedAt(left)
    );
  }, [books, stories]);

  function handleBookmarkSaved(saved: BookmarkItem) {
    setBookmarks((current) =>
      current.map((bookmark) =>
        bookmark.id === saved.id ? saved : bookmark
      )
    );
  }

  function handleBookmarkRemoved(bookmarkId: string) {
    setBookmarks((current) =>
      current.filter((bookmark) => bookmark.id !== bookmarkId)
    );
  }

  async function unfavorite(entry: FavoriteEntry) {
    const key = favoriteKey(entry);
    const kind = entry.kind;
    const id = entry.kind === "book" ? entry.book.id : entry.story.id;
    const title = entry.kind === "book" ? entry.book.title : entry.story.title;

    setPendingFavorite(key);
    setError("");

    try {
      const response = await fetch("/api/favorites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, isFavorite: false }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? `Could not unfavorite ${title}.`);
      }

      if (kind === "book") {
        setBooks((current) =>
          current.map((book) =>
            book.id === id ? { ...book, isFavorite: false } : book
          )
        );
      } else {
        setStories((current) =>
          current.map((story) =>
            story.id === id ? { ...story, isFavorite: false } : story
          )
        );
      }
    } catch (unfavoriteError) {
      setError(
        unfavoriteError instanceof Error
          ? unfavoriteError.message
          : `Could not unfavorite ${title}.`
      );
    } finally {
      setPendingFavorite(null);
    }
  }

  return (
    <>
      <header className="mb-7">
        <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-brand">
          Saved for later
        </p>
        <h1 className="m-0 text-3xl font-bold tracking-tight text-ink">
          Bookmarks
        </h1>
        <p className="mb-0 mt-2 max-w-2xl text-sm text-muted">
          Keep your place in every book and story, add a note, and return to
          your favorite reads.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Bookmark views"
        className="mb-6 inline-flex flex-wrap gap-1 rounded-2xl border border-line bg-white p-1 shadow-sm"
      >
        <button
          id="bookmarks-tab-pages"
          type="button"
          role="tab"
          aria-selected={tab === "pages"}
          aria-controls="bookmarks-panel-pages"
          onClick={() => setTab("pages")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            tab === "pages"
              ? "bg-brand text-white shadow-sm"
              : "text-muted hover:bg-paper hover:text-brand"
          }`}
        >
          <Bookmark size={16} fill={tab === "pages" ? "currentColor" : "none"} />
          Pages
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              tab === "pages" ? "bg-white/20 text-white" : "bg-paper text-muted"
            }`}
          >
            {bookmarks.length}
          </span>
        </button>
        <button
          id="bookmarks-tab-favorites"
          type="button"
          role="tab"
          aria-selected={tab === "favorites"}
          aria-controls="bookmarks-panel-favorites"
          onClick={() => setTab("favorites")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            tab === "favorites"
              ? "bg-brand text-white shadow-sm"
              : "text-muted hover:bg-paper hover:text-brand"
          }`}
        >
          <Heart size={16} fill={tab === "favorites" ? "currentColor" : "none"} />
          Favorites
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              tab === "favorites"
                ? "bg-white/20 text-white"
                : "bg-paper text-muted"
            }`}
          >
            {favorites.length}
          </span>
        </button>
      </div>

      {tab === "pages" ? (
        <section
          id="bookmarks-panel-pages"
          role="tabpanel"
          aria-labelledby="bookmarks-tab-pages"
        >
          {bookmarks.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {bookmarks.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onSaved={handleBookmarkSaved}
                  onRemoved={handleBookmarkRemoved}
                />
              ))}
            </div>
          ) : (
            <EmptyPages />
          )}
        </section>
      ) : (
        <section
          id="bookmarks-panel-favorites"
          role="tabpanel"
          aria-labelledby="bookmarks-tab-favorites"
        >
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {favorites.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {favorites.map((entry) => (
                <FavoriteCard
                  key={favoriteKey(entry)}
                  entry={entry}
                  pending={pendingFavorite === favoriteKey(entry)}
                  onUnfavorite={() => void unfavorite(entry)}
                />
              ))}
            </div>
          ) : (
            <EmptyFavorites />
          )}
        </section>
      )}
    </>
  );
}

function EmptyPages() {
  return (
    <div className="rounded-3xl border border-dashed border-[#d6ded3] bg-white px-5 py-14 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Bookmark size={25} />
      </div>
      <h2 className="m-0 text-lg font-bold">No saved pages yet</h2>
      <p className="mx-auto mb-5 mt-2 max-w-md text-sm leading-6 text-muted">
        While you are reading a book or story, tap the bookmark button to save
        that page. You can add a note from this page whenever you like.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/library"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-[#274a38]"
        >
          <Library size={15} /> Browse library
        </Link>
        <Link
          href="/story-time"
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-[#7954a5] no-underline hover:border-[#b79bd2] hover:bg-[#f8f6fa]"
        >
          <WandSparkles size={15} /> Open Story Time
        </Link>
      </div>
    </div>
  );
}

function EmptyFavorites() {
  return (
    <div className="rounded-3xl border border-dashed border-[#d6ded3] bg-white px-5 py-14 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#fdeef1] text-[#b33d52]">
        <Heart size={25} />
      </div>
      <h2 className="m-0 text-lg font-bold">No favorites yet</h2>
      <p className="mx-auto mb-5 mt-2 max-w-md text-sm leading-6 text-muted">
        Tap the heart on a book or story to keep it close. Your favorite books
        and stories will gather here.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/library"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-[#274a38]"
        >
          <Library size={15} /> Go to Library
        </Link>
        <Link
          href="/story-time"
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-[#7954a5] no-underline hover:border-[#b79bd2] hover:bg-[#f8f6fa]"
        >
          <WandSparkles size={15} /> Visit Story Time
        </Link>
      </div>
    </div>
  );
}

function FavoriteCard({
  entry,
  pending,
  onUnfavorite,
}: {
  entry: FavoriteEntry;
  pending: boolean;
  onUnfavorite: () => void;
}) {
  const isBook = entry.kind === "book";
  const id = isBook ? entry.book.id : entry.story.id;
  const title = isBook ? entry.book.title : entry.story.title;
  const href = isBook ? `/reader/${id}` : `/story-time/${id}`;
  const typeLabel = isBook ? "Book" : "Story";
  const subtitle = isBook
    ? `${entry.book.author} · ${entry.book.category}`
    : `${
        entry.story.storyType === "original"
          ? "Original story"
          : "Movie-inspired"
      } · ${entry.story.pageCount} ${
        entry.story.pageCount === 1 ? "page" : "pages"
      }`;
  const meta = isBook
    ? entry.book.currentPage > 0
      ? `Page ${entry.book.currentPage}${
          entry.book.totalPages ? ` of ${entry.book.totalPages}` : ""
        }`
      : "Not started"
    : entry.story.status === "published"
      ? "Published"
      : "Draft";

  return (
    <article className="flex gap-4 rounded-2xl border border-line bg-white p-3 shadow-soft">
      <Link href={href} className="w-24 shrink-0 no-underline">
        {isBook ? (
          <BookCover
            title={entry.book.title}
            author={entry.book.author}
            color={entry.book.coverColor}
            compact
          />
        ) : (
          <div className="story-cover" style={{ height: 112 }}>
            {entry.story.coverImageUrl ? (
              <img
                src={entry.story.coverImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1.5 p-2 text-center">
                <Sparkles size={17} />
                <span className="line-clamp-3 font-serif text-xs font-bold leading-tight">
                  {entry.story.title}
                </span>
              </div>
            )}
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col py-1">
        <span
          className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            isBook
              ? "bg-brand-soft text-brand"
              : "bg-[#f2eafa] text-[#7954a5]"
          }`}
        >
          {typeLabel}
        </span>
        <Link href={href} className="mt-2 no-underline">
          <h2 className="m-0 line-clamp-2 text-sm font-bold leading-5 text-ink">
            {title}
          </h2>
        </Link>
        <p className="m-0 mt-1 truncate text-[11px] text-muted">{subtitle}</p>
        <p className="m-0 mt-1 text-[11px] text-muted">{meta}</p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <Link
            href={href}
            className={`inline-flex items-center gap-1 text-xs font-bold no-underline ${
              isBook ? "text-brand" : "text-[#7954a5]"
            }`}
          >
            Open <ArrowUpRight size={13} />
          </Link>
          <button
            type="button"
            onClick={onUnfavorite}
            disabled={pending}
            aria-label={`Unfavorite ${title}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-muted transition hover:border-[#d46a7a] hover:text-[#b33d52] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Heart size={13} fill="currentColor" />
            {pending ? "Removing..." : "Unfavorite"}
          </button>
        </div>
      </div>
    </article>
  );
}
