/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Sparkles } from "lucide-react";

import { BookCover } from "@/components/book-cover";
import type { BookmarkItem } from "@/lib/types";

const MAX_NOTE_LENGTH = 500;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function BookmarkCard({
  bookmark,
  onSaved,
  onRemoved,
}: {
  bookmark: BookmarkItem;
  onSaved: (bookmark: BookmarkItem) => void;
  onRemoved: (bookmarkId: string) => void;
}) {
  const [draft, setDraft] = useState(bookmark.note);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(bookmark.note);
  }, [bookmark.note]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(""), 2600);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(""), 4000);
    return () => window.clearTimeout(timer);
  }, [error]);

  const typeLabel = bookmark.kind === "book" ? "Book" : "Story";
  const openHref =
    bookmark.kind === "book"
      ? `/reader/${bookmark.targetId}?page=${bookmark.pageNumber}`
      : `/story-time/${bookmark.targetId}?page=${bookmark.pageNumber}`;
  const pageLabel = bookmark.pageCount
    ? `Page ${bookmark.pageNumber} of ${bookmark.pageCount}`
    : `Page ${bookmark.pageNumber}`;
  const dirty = draft.trim() !== bookmark.note;

  async function saveNote() {
    const note = draft.trim();

    if (note.length > MAX_NOTE_LENGTH) {
      setError("Note must be 500 characters or fewer.");
      return;
    }

    setSaving(true);
    setError("");
    setStatus("");

    try {
      const response = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = (await response.json().catch(() => null)) as
        | (Partial<BookmarkItem> & { error?: string })
        | null;

      if (!response.ok || !data?.id) {
        throw new Error(data?.error ?? "Could not save this note.");
      }

      const saved = data as BookmarkItem;
      setDraft(saved.note);
      setStatus("Note saved");
      onSaved(saved);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this note."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeBookmark() {
    setRemoving(true);
    setError("");
    setStatus("");

    try {
      const response = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not remove this bookmark.");
      }

      onRemoved(bookmark.id);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove this bookmark."
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <article
      id={`bookmark-${bookmark.id}`}
      className="flex flex-col rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5"
    >
      <div className="flex items-start gap-4">
        <BookmarkThumb bookmark={bookmark} />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                bookmark.kind === "book"
                  ? "bg-brand-soft text-brand"
                  : "bg-[#f2eafa] text-[#7954a5]"
              }`}
            >
              {typeLabel}
            </span>
            <span className="text-[11px] font-semibold text-muted">
              {pageLabel}
            </span>
          </div>
          <h2 className="m-0 line-clamp-2 text-base font-bold leading-6 text-ink">
            {bookmark.title}
          </h2>
          <p className="m-0 mt-1 truncate text-xs text-muted">
            {bookmark.author || "Saved from your reading"}
          </p>
        </div>
        <Bookmark
          size={17}
          className="mt-1 shrink-0 text-brand"
          fill="currentColor"
        />
      </div>

      <label
        htmlFor={`bookmark-note-${bookmark.id}`}
        className="mt-4 text-[11px] font-bold uppercase tracking-wider text-muted"
      >
        Note
      </label>
      <textarea
        id={`bookmark-note-${bookmark.id}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={MAX_NOTE_LENGTH}
        rows={3}
        placeholder="Add a thought or reminder about this page..."
        className="mt-2 w-full resize-y rounded-xl border border-line bg-paper px-3 py-2.5 text-sm leading-6 text-ink outline-none focus:border-brand focus:bg-white"
      />
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
        <span>{status || error ? "" : "Notes are saved to this bookmark."}</span>
        <span>
          {draft.length}/{MAX_NOTE_LENGTH}
        </span>
      </div>

      {(status || error) && (
        <p
          role={error ? "alert" : "status"}
          className={`m-0 mt-2 rounded-lg px-3 py-2 text-xs font-semibold ${
            error ? "bg-red-50 text-red-700" : "bg-brand-soft text-brand"
          }`}
        >
          {error || status}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3">
        <p className="m-0 text-[11px] leading-5 text-muted">
          Saved {formatDate(bookmark.createdAt)}
          <span className="mx-1.5 text-[#c3c9bf]">·</span>
          Updated {formatDate(bookmark.updatedAt)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={openHref}
            className="inline-flex items-center rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink no-underline transition hover:border-brand hover:text-brand"
          >
            Open
          </Link>
          <button
            type="button"
            onClick={() => void saveNote()}
            disabled={saving || !dirty}
            className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#274a38] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save note"}
          </button>
          <button
            type="button"
            onClick={() => void removeBookmark()}
            disabled={removing}
            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {removing ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </article>
  );
}

function BookmarkThumb({ bookmark }: { bookmark: BookmarkItem }) {
  if (bookmark.kind === "book") {
    return (
      <div className="w-20 shrink-0">
        <BookCover
          title={bookmark.title}
          author={bookmark.author}
          color={bookmark.coverColor}
          compact
        />
      </div>
    );
  }

  return (
    <div className="story-cover w-20 shrink-0" style={{ height: 112 }}>
      {bookmark.coverImageUrl ? (
        <img
          src={bookmark.coverImageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1.5 p-2 text-center">
          <Sparkles size={16} />
          <span className="line-clamp-3 font-serif text-[11px] font-bold leading-tight">
            {bookmark.title}
          </span>
        </div>
      )}
    </div>
  );
}
