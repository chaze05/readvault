/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Pause,
  Pencil,
  Printer,
  Sparkles,
  Volume2,
} from "lucide-react";

import { BookmarkButton } from "@/components/bookmarks/bookmark-button";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import {
  loadReaderBookmarks,
  mergeBookmarksAfterLoad,
} from "@/lib/reader-bookmarks";
import type { StoryTextSize } from "@/lib/preferences";
import type { BookmarkItem, Story } from "@/lib/types";

const TEXT_SIZE_CLASS: Record<StoryTextSize, string> = {
  small: "story-text-small",
  medium: "story-text-medium",
  large: "story-text-large",
};

export function StoryReader({
  storyId,
  initialStory,
  textSize,
  initialPage,
  isFavorite,
}: {
  storyId: string;
  initialStory: Story;
  textSize: StoryTextSize;
  initialPage?: number;
  isFavorite: boolean;
}) {
  const [story] = useState(initialStory);
  const [pageIndex, setPageIndex] = useState(() =>
    Math.min(
      Math.max(0, (initialPage ?? initialStory.currentPage) - 1),
      Math.max(0, (initialStory.pages?.length || 1) - 1)
    )
  );
  const [speaking, setSpeaking] = useState(false);
  const [curtainVisible, setCurtainVisible] = useState(true);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [bookmarkError, setBookmarkError] = useState("");
  const changedBookmarkPagesRef = useRef<Set<number>>(new Set());
  const pages = story.pages || [];
  const page = pages[pageIndex];
  const storageKey = `readvault-story-progress-${storyId}`;

  useEffect(() => {
    const timer = window.setTimeout(() => setCurtainVisible(false), 1_300);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBookmarks() {
      const result = await loadReaderBookmarks(
        `/api/bookmarks?storyId=${encodeURIComponent(storyId)}`
      );
      if (cancelled) return;

      if (!result.ok) {
        setBookmarkError(result.error);
        return;
      }

      setBookmarkError("");
      setBookmarks((current) =>
        mergeBookmarksAfterLoad(
          result.bookmarks,
          current,
          changedBookmarkPagesRef.current
        )
      );
    }

    void loadBookmarks();

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  useEffect(() => {
    if (initialPage !== undefined) return;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    const storedPage = Number(stored);
    if (Number.isFinite(storedPage) && storedPage > 0) {
      setPageIndex(Math.min(Math.max(0, storedPage - 1), Math.max(0, pages.length - 1)));
    }
  }, [initialPage, storageKey, pages.length]);

  useEffect(() => {
    const currentPage = pageIndex + 1;
    window.localStorage.setItem(storageKey, String(currentPage));

    const timer = window.setTimeout(() => {
      void fetch(`/api/stories/${storyId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPage }),
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [pageIndex, storyId, storageKey]);

  useEffect(
    () => () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    },
    []
  );

  function speak() {
    if (!page || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(page.content);
    utterance.lang = story.language === "en" ? "en-US" : story.language;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  function stop() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function handleBookmarkChange(
    bookmark: BookmarkItem | null,
    changedPage: number
  ) {
    changedBookmarkPagesRef.current.add(changedPage);
    setBookmarks((current) => {
      const remaining = current.filter(
        (item) =>
          item.pageNumber !== changedPage && item.id !== bookmark?.id
      );
      return bookmark ? [bookmark, ...remaining] : remaining;
    });
  }

  const pageBookmark = bookmarks.find(
    (bookmark) => bookmark.pageNumber === pageIndex + 1
  );

  if (!pages.length) {
    return (
      <main className="min-h-screen bg-[#f8f6fa] p-8">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center">
          <BookOpen className="mx-auto mb-3 text-[#7954a5]" size={30} />
          <h1 className="text-xl font-bold">{story.title}</h1>
          <p className="text-sm text-muted">This story does not have any pages yet.</p>
          <Link
            href={`/story-time/${storyId}/edit`}
            className="text-sm font-semibold text-[#7954a5]"
          >
            Add story pages
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#f8f6fa]">
      {curtainVisible && (
        <div className="reader-curtain story-curtain">
          <div className="curtain-sparkles" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="curtain-content">
            <div className="curtain-book">
              <Sparkles size={34} />
            </div>
            <p className="curtain-kicker">Story Time</p>
            <h2 className="curtain-title">{story.title}</h2>
            <p className="curtain-note">A little adventure is about to begin.</p>
          </div>
        </div>
      )}

      <div className="screen-story">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e9e2ef] bg-white/95 px-4 py-3 backdrop-blur">
          <Link
            href="/story-time"
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink no-underline"
          >
            <ArrowLeft size={17} /> Story Time
          </Link>
          <div className="hidden text-center sm:block">
            <p className="m-0 text-sm font-bold">{story.title}</p>
            <p className="m-0 text-[10px] text-muted">
              Page {pageIndex + 1} of {pages.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BookmarkButton
              key={`bookmark-${pageIndex}`}
              kind="story"
              targetId={storyId}
              pageNumber={pageIndex + 1}
              initialBookmarked={Boolean(pageBookmark)}
              initialBookmarkId={pageBookmark?.id}
              onChange={handleBookmarkChange}
            />
            <FavoriteButton
              kind="story"
              targetId={storyId}
              initialFavorite={isFavorite}
            />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print / Save PDF</span>
            </button>
            <Link
              href={`/story-time/${storyId}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted no-underline"
            >
              <Pencil size={14} /> Edit
            </Link>
          </div>
        </header>

        {bookmarkError && (
          <p
            role="status"
            className="m-0 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-[11px] font-semibold text-amber-800"
          >
            {bookmarkError}
          </p>
        )}

        <div className="mx-auto flex min-h-[calc(100vh-60px)] max-w-4xl flex-col items-center justify-center px-4 py-8">
          <div className="mb-4 w-full max-w-2xl text-center">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#7954a5]">
              {story.storyType === "original"
                ? "An original ReadVault story"
                : "An unofficial, independently written movie-inspired story"}
            </p>
            <h1 className="m-0 font-serif text-2xl font-bold text-ink sm:text-3xl">
              {story.title}
            </h1>
          </div>

          <article
            key={page.id}
            className={`reader-page-enter w-full max-w-2xl overflow-hidden rounded-[26px] border border-[#e9e2ef] bg-white shadow-[0_18px_55px_rgba(55,38,72,.08)] ${TEXT_SIZE_CLASS[textSize]}`}
          >
            {page.imageUrl ? (
              <div className="flex max-h-[48vh] justify-center bg-[#f4eff8]">
                <img
                  src={page.imageUrl}
                  alt={
                    page.imageAlt ||
                    `Illustration for ${story.title}, page ${pageIndex + 1}`
                  }
                  className="max-h-[48vh] w-full object-contain"
                />
              </div>
            ) : (
              <div className="grid h-48 place-items-center bg-gradient-to-br from-[#eee5f6] to-[#e1eef0] text-[#7954a5]">
                <SparklesFallback />
              </div>
            )}
            <div className="px-6 py-7 sm:px-12 sm:py-10">
              <p className="mb-5 text-center text-[10px] font-bold uppercase tracking-[.2em] text-[#a18bb7]">
                Page {pageIndex + 1}
              </p>
              <p className="story-page-text m-0 whitespace-pre-wrap text-center font-serif text-[#393341]">
                {page.content}
              </p>
            </div>
          </article>

          <div className="mt-5 flex w-full max-w-2xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                stop();
                setPageIndex((index) => Math.max(0, index - 1));
              }}
              disabled={pageIndex === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e1d8e9] bg-white px-4 py-3 text-sm font-semibold text-[#685778] disabled:opacity-40"
            >
              <ArrowLeft size={16} /> Previous
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={speaking ? stop : speak}
                className="inline-flex items-center gap-2 rounded-xl bg-[#eee5f6] px-3 py-3 text-sm font-semibold text-[#7954a5]"
                title="Read this page aloud"
              >
                {speaking ? <Pause size={16} /> : <Volume2 size={16} />}
                <span className="hidden sm:inline">
                  {speaking ? "Stop reading" : "Read aloud"}
                </span>
              </button>
              <span className="text-xs font-semibold text-muted">
                {pageIndex + 1}/{pages.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                stop();
                setPageIndex((index) => Math.min(pages.length - 1, index + 1));
              }}
              disabled={pageIndex === pages.length - 1}
              className="inline-flex items-center gap-2 rounded-xl bg-[#7954a5] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Next <ArrowRight size={16} />
            </button>
          </div>

          <div className="mt-4 h-1.5 w-full max-w-2xl overflow-hidden rounded-full bg-[#e9e2ef]">
            <div
              className="h-full rounded-full bg-[#9b7ac0] transition-all"
              style={{ width: `${((pageIndex + 1) / pages.length) * 100}%` }}
            />
          </div>
          <p className="mt-4 text-center text-[11px] text-muted">
            ReadVault Story Time · Read together, imagine together.
          </p>
        </div>
      </div>

      <section className="print-story">
        <div className="print-cover">
          <h1>{story.title}</h1>
          <p>{story.description}</p>
        </div>
        {pages.map((item, index) => (
          <article className="print-page" key={item.id}>
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.imageAlt || `Illustration for page ${index + 1}`}
              />
            )}
            <p className="print-page-number">Page {index + 1}</p>
            <p className="print-page-text">{item.content}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function SparklesFallback() {
  return (
    <div className="text-center">
      <span className="text-5xl">✨</span>
      <p className="mt-3 text-xs font-semibold uppercase tracking-widest">
        Your illustration goes here
      </p>
    </div>
  );
}
