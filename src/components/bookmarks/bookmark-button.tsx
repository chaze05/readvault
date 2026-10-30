"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, ExternalLink, Trash2 } from "lucide-react";

import type { BookmarkItem, BookmarkKind } from "@/lib/types";

export function BookmarkButton({
  kind,
  targetId,
  pageNumber,
  initialBookmarked,
  initialBookmarkId,
  onChange,
  className,
}: {
  kind: BookmarkKind;
  targetId: string;
  pageNumber: number;
  initialBookmarked: boolean;
  initialBookmarkId?: string;
  onChange?: (bookmark: BookmarkItem | null, pageNumber: number) => void;
  className?: string;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [bookmarkId, setBookmarkId] = useState(initialBookmarkId);
  const [pending, setPending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setBookmarked(initialBookmarked);
    setBookmarkId(initialBookmarkId);
    if (!initialBookmarked) setMenuOpen(false);
  }, [initialBookmarked, initialBookmarkId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(""), 4000);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!menuOpen) return;

    const firstItem =
      wrapperRef.current?.querySelector<HTMLElement>("[role='menuitem']");
    firstItem?.focus();

    function onPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !wrapperRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function save() {
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "book"
            ? { bookId: targetId, pageNumber }
            : { storyId: targetId, pageNumber }
        ),
      });
      const data = (await response.json().catch(() => null)) as
        | (Partial<BookmarkItem> & { error?: string })
        | null;

      if (!response.ok || !data?.id) {
        throw new Error(data?.error ?? "Could not save this bookmark.");
      }

      const bookmark = data as BookmarkItem;
      setBookmarked(true);
      setBookmarkId(bookmark.id);
      setNotice(`Bookmarked page ${pageNumber}`);
      onChange?.(bookmark, pageNumber);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this bookmark."
      );
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!bookmarkId) {
      setError("Could not find this bookmark.");
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (response.status === 404) {
        setMenuOpen(false);
        setBookmarked(false);
        setBookmarkId(undefined);
        setNotice("Bookmark removed");
        onChange?.(null, pageNumber);
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not remove this bookmark.");
      }

      setMenuOpen(false);
      setBookmarked(false);
      setBookmarkId(undefined);
      setNotice("Bookmark removed");
      onChange?.(null, pageNumber);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove this bookmark."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={
          bookmarked
            ? () => setMenuOpen((value) => !value)
            : () => void save()
        }
        disabled={pending}
        aria-label={
          bookmarked
            ? `Bookmarked page ${pageNumber}. Open bookmark options.`
            : `Bookmark page ${pageNumber}`
        }
        aria-haspopup={bookmarked ? "menu" : undefined}
        aria-expanded={bookmarked ? menuOpen : undefined}
        title={bookmarked ? "Bookmarked" : `Bookmark page ${pageNumber}`}
        className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
          bookmarked
            ? "border-brand bg-brand-soft text-brand"
            : "border-line bg-white text-muted hover:border-brand hover:text-brand"
        }`}
      >
        <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Bookmark options"
          className="absolute right-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-white p-1 text-left shadow-soft"
        >
          <Link
            role="menuitem"
            href="/bookmarks"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink no-underline transition hover:bg-brand-soft hover:text-brand focus:bg-brand-soft focus:text-brand focus:outline-none"
          >
            <ExternalLink size={14} /> Open bookmarks
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void remove()}
            disabled={pending}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-700 transition hover:bg-red-50 focus:bg-red-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={14} /> Remove bookmark
          </button>
        </div>
      )}

      {notice && (
        <span
          role="status"
          className="absolute right-0 top-full z-30 mt-2 whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-[11px] font-semibold text-white shadow-soft"
        >
          {notice}
        </span>
      )}

      {error && (
        <span
          role="alert"
          className="absolute right-0 top-full z-30 mt-2 whitespace-nowrap rounded-lg bg-red-700 px-3 py-2 text-[11px] font-semibold text-white shadow-soft"
        >
          {error}
        </span>
      )}
    </div>
  );
}
