/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";

import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";
import type { Story } from "@/lib/types";

export function StoryTimeApp() {
  const [stories, setStories] = useState<Story[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const response = await fetch("/api/stories", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load your stories.");
      setStories(await response.json());
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      stories.filter((story) => {
        const matchesText = `${story.title} ${story.description || ""} ${
          story.sourceTitle || ""
        }`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesType = filter === "all" || story.storyType === filter;
        return matchesText && matchesType;
      }),
    [stories, query, filter]
  );

  async function remove(story: Story) {
    if (!window.confirm(`Delete "${story.title}" and its story images?`)) return;

    const response = await fetch(`/api/stories/${story.id}`, {
      method: "DELETE",
    });
    if (response.ok) await load();
    else setError("Could not delete this story.");
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <div className="mobile-topbar items-center justify-between border-b border-line bg-white px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-ink no-underline">
            <span className="brand-mark !h-8 !w-8 !rounded-lg">
              <BookOpen size={17} />
            </span>
            ReadVault
          </Link>
          <Link
            href="/story-time/new"
            className="rounded-xl bg-[#7954a5] px-3 py-2 text-xs font-semibold text-white no-underline"
          >
            Create story
          </Link>
        </div>

        <div className="main-inner">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[#8b65bd]">
                A little library of adventures
              </p>
              <h1 className="m-0 text-3xl font-bold tracking-tight text-ink">
                Story Time ✨
              </h1>
              <p className="mb-0 mt-2 max-w-xl text-sm text-muted">
                Create original stories, make picture books, and enjoy
                movie-inspired adventures written in your own words.
              </p>
            </div>
            <Link
              href="/story-time/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#7954a5] px-4 py-3 text-sm font-semibold text-white no-underline shadow-sm hover:bg-[#65428f]"
            >
              <Plus size={16} /> Create a story
            </Link>
          </header>

          <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa195]" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your stories..."
                className="w-full rounded-xl border border-line bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-[#9b7ac0]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All stories"],
                ["original", "Original"],
                ["movie_inspired", "Movie-inspired"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold ${
                    filter === value
                      ? "bg-[#7954a5] text-white"
                      : "border border-line bg-white text-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-muted">
              Loading your storybooks...
            </div>
          ) : filtered.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((story) => (
                <article
                  key={story.id}
                  className="overflow-hidden rounded-2xl border border-line bg-white p-3 shadow-soft"
                >
                  <Link href={`/story-time/${story.id}`} className="block no-underline">
                    <div className="story-cover">
                      {story.coverImageUrl ? (
                        <img
                          src={story.coverImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
                          <span className="rounded-2xl bg-white/20 p-3">
                            <Sparkles size={27} />
                          </span>
                          <span className="font-serif text-xl font-bold leading-tight">
                            {story.title}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest opacity-80">
                            A ReadVault story
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="px-1 pb-1 pt-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7954a5]">
                        {story.storyType === "original"
                          ? "Original story"
                          : "Movie-inspired"}
                      </span>
                      <h2 className="mb-1 mt-1 line-clamp-2 min-h-10 text-sm font-bold text-ink">
                        {story.title}
                      </h2>
                      <p className="m-0 text-[11px] text-muted">
                        {story.pageCount}{" "}
                        {story.pageCount === 1 ? "page" : "pages"} · {story.status}
                      </p>
                    </div>
                  </Link>
                  <div className="mt-2 flex items-center justify-end gap-1 border-t border-line pt-2">
                    <Link
                      href={`/story-time/${story.id}/edit`}
                      className="rounded-lg p-2 text-muted hover:bg-[#f5f0fa] hover:text-[#7954a5]"
                      aria-label={`Edit ${story.title}`}
                    >
                      <Pencil size={14} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => void remove(story)}
                      className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${story.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#d9cce7] bg-white px-5 py-14 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#f2eafa] text-[#7954a5]">
                <WandSparkles size={26} />
              </div>
              <h2 className="m-0 text-lg font-bold">
                {stories.length ? "No stories match your search" : "Your story shelf is waiting"}
              </h2>
              <p className="mx-auto mb-5 mt-2 max-w-md text-sm text-muted">
                {stories.length
                  ? "Try another search or filter."
                  : "Create a magical original story, write your own version of a movie-inspired adventure, and add pictures to every page."}
              </p>
              {!stories.length && (
                <Link
                  href="/story-time/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#7954a5] px-4 py-3 text-sm font-semibold text-white no-underline"
                >
                  <Plus size={16} /> Create your first story
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
