/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { upload } from "@vercel/blob/client";

import type { Story, StoryPage, StoryType } from "@/lib/types";

type DraftPage = {
  id?: string;
  content: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function StoryEditor({ storyId }: { storyId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [storyType, setStoryType] = useState<StoryType>("original");
  const [sourceTitle, setSourceTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ageRange, setAgeRange] = useState("Ages 6–8");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [idea, setIdea] = useState("");
  const [pages, setPages] = useState<DraftPage[]>([{ content: "" }]);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(storyId));
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!storyId) return;

    fetch(`/api/stories/${storyId}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Story not found.");
        const story: Story = await response.json();
        setTitle(story.title);
        setStoryType(story.storyType);
        setSourceTitle(story.sourceTitle || "");
        setDescription(story.description || "");
        setAgeRange(story.ageRange || "Ages 6–8");
        setStatus(story.status);
        setCoverImageUrl(story.coverImageUrl);
        setPages(
          story.pages?.length
            ? story.pages.map((page: StoryPage) => ({
                id: page.id,
                content: page.content,
                imageUrl: page.imageUrl,
                imageAlt: page.imageAlt,
              }))
            : [{ content: "" }]
        );
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Unable to load story.")
      )
      .finally(() => setLoading(false));
  }, [storyId]);

  function updatePage(index: number, content: string) {
    setPages((current) =>
      current.map((page, pageIndex) =>
        pageIndex === index ? { ...page, content } : page
      )
    );
  }

  function addPage() {
    setPages((current) => [...current, { content: "" }]);
  }

  function movePage(index: number, direction: -1 | 1) {
    setPages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removePage(index: number) {
    if (pages.length === 1) {
      setPages([{ content: "" }]);
      return;
    }
    setPages((current) => current.filter((_, pageIndex) => pageIndex !== index));
  }

  function insertStarter() {
    if (storyType === "original") {
      if (!title.trim()) setTitle("The Little Star's Big Wish");
      if (!description.trim()) {
        setDescription(
          "A gentle original story about courage, kindness, and believing in yourself."
        );
      }
      setPages([
        {
          content:
            "High above a quiet little village lived a tiny star named Lumi. Every night, Lumi watched the world below and wished to shine brightly enough to help someone.",
        },
        {
          content:
            'One evening, a little child looked out the window and whispered, "I wish I could find my way home." Lumi heard the wish and gathered all the courage in her tiny heart.',
        },
        {
          content:
            "Lumi glowed as warmly as she could. Her gentle light guided the child along the familiar path, past the old tree and the sleepy garden.",
        },
        {
          content:
            "When the child reached home safely, Lumi learned something important: even a small light can make a big difference. And from that night on, she shone with joy.",
        },
      ]);
    } else {
      setPages([
        {
          content: `This story is inspired by the broad themes of ${
            sourceTitle.trim() || "a favorite movie"
          }. It is an independently written story in our own words, not an official movie story.`,
        },
        {
          content:
            "In this adventure, the main character faces a challenge. Describe the challenge in your own words without copying dialogue or scenes from the movie.",
        },
        {
          content:
            "A friend, family member, or new discovery helps the character understand what matters most. Describe the lesson or important choice.",
        },
        {
          content:
            "At the end, explain how the character has grown and what readers can learn about kindness, courage, friendship, or another positive theme.",
        },
      ]);
    }
  }

  async function uploadImage(file: File, pageIndex?: number) {
    if (!storyId) {
      setError("Save the story first, then add illustrations.");
      return;
    }
    if (pageIndex !== undefined && !pages[pageIndex]?.id) {
      setError("Save this new page first, then add its illustration.");
      return;
    }

    const extension = IMAGE_TYPES[file.type];
    if (!extension) {
      setError("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Images must be 8 MB or smaller.");
      return;
    }

    setError("");
    setMessage("");

    try {
      const blob = await upload(
        `readvault/story-images/${crypto.randomUUID()}.${extension}`,
        file,
        {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          clientPayload: JSON.stringify({ kind: "story-image" }),
        }
      );

      const response = await fetch(`/api/stories/${storyId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: blob.url,
          kind: pageIndex === undefined ? "cover" : "page",
          pageId: pageIndex === undefined ? undefined : pages[pageIndex]?.id,
          alt: "",
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Image upload failed.");
      }

      const imageUrl = data.imageUrl || blob.url;

      if (pageIndex === undefined) {
        setCoverImageUrl(imageUrl);
      } else {
        setPages((current) =>
          current.map((page, index) =>
            index === pageIndex ? { ...page, imageUrl } : page
          )
        );
      }

      setMessage("Illustration saved.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Image upload failed."
      );
    }
  }

  async function generateDraft() {
    setGenerating(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/ai/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          idea,
          storyType,
          sourceTitle,
          ageRange,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not generate a story draft.");
      }

      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (Array.isArray(data.pages) && data.pages.length) {
        setPages(data.pages.map((content: string) => ({ content })));
      }

      setMessage("AI draft ready. Review and edit it before publishing.");
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Could not generate a story draft."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!title.trim()) throw new Error("Please add a story title.");
      if (storyType === "movie_inspired" && !sourceTitle.trim()) {
        throw new Error("Please enter the movie or inspiration title.");
      }

      const cleanPages = pages.filter((page) => page.content.trim());
      if (!cleanPages.length) throw new Error("Add some story text before saving.");

      const payload = {
        title,
        storyType,
        sourceTitle,
        description,
        ageRange,
        language: "en",
        status,
        pages: cleanPages.map((page) => ({
          id: page.id,
          content: page.content,
        })),
      };

      const response = await fetch(
        storyId ? `/api/stories/${storyId}` : "/api/stories",
        {
          method: storyId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save story.");
      }

      if (!storyId) {
        router.push(`/story-time/${result.id}/edit`);
        router.refresh();
        return;
      }

      if (result.pages) {
        const updated: Story = result;
        setCoverImageUrl(updated.coverImageUrl);
        setPages(
          updated.pages?.map((page) => ({
            id: page.id,
            content: page.content,
            imageUrl: page.imageUrl,
            imageAlt: page.imageAlt,
          })) || []
        );
      } else {
        const refreshed = await fetch(`/api/stories/${storyId}`, {
          cache: "no-store",
        });
        if (refreshed.ok) {
          const data: Story = await refreshed.json();
          setCoverImageUrl(data.coverImageUrl);
          setPages(
            data.pages?.map((page) => ({
              id: page.id,
              content: page.content,
              imageUrl: page.imageUrl,
              imageAlt: page.imageAlt,
            })) || []
          );
        }
      }

      setMessage("Story saved successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-sm text-muted">
        Loading story editor...
      </div>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-[#9b7ac0]";

  return (
    <main className="min-h-screen bg-[#f8f6fa]">
      <header className="flex items-center justify-between border-b border-[#e9e2ef] bg-white px-5 py-4">
        <Link
          href="/story-time"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink no-underline"
        >
          <ArrowLeft size={17} /> Story Time
        </Link>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#7954a5] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save story"}
        </button>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-7">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#7954a5]">
            Storybook creator
          </p>
          <h1 className="m-0 text-3xl font-bold text-ink">
            {storyId ? "Edit your story" : "Create a story"}
          </h1>
          <p className="mb-0 mt-2 text-sm text-muted">
            Write a page at a time. You can add illustrations after saving.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}
        {message && (
          <p className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
            {message}
          </p>
        )}

        <section className="mb-6 rounded-2xl border border-[#e9e2ef] bg-white p-5 shadow-sm">
          <h2 className="mb-4 mt-0 text-base font-bold">Story details</h2>
          <label className="mb-2 block text-xs font-semibold text-muted">
            Story title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              placeholder="The Little Star Who Could"
              className={inputClass}
            />
          </label>

          <div className="my-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-muted">
              Story type
              <select
                value={storyType}
                onChange={(event) => setStoryType(event.target.value as StoryType)}
                className={inputClass}
              >
                <option value="original">Original story</option>
                <option value="movie_inspired">Movie-inspired summary/adventure</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted">
              Reading level
              <select
                value={ageRange}
                onChange={(event) => setAgeRange(event.target.value)}
                className={inputClass}
              >
                <option>Ages 4–5</option>
                <option>Ages 6–8</option>
                <option>Ages 9–12</option>
                <option>Family reading</option>
              </select>
            </label>
          </div>

          {storyType === "movie_inspired" && (
            <label className="mb-4 block text-xs font-semibold text-muted">
              Movie or broad inspiration title
              <input
                value={sourceTitle}
                onChange={(event) => setSourceTitle(event.target.value)}
                maxLength={160}
                placeholder="e.g. an ocean adventure movie"
                className={inputClass}
              />
            </label>
          )}

          <label className="mb-4 block text-xs font-semibold text-muted">
            Short description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="What is this story about?"
              className={inputClass}
            />
          </label>

          <label className="block text-xs font-semibold text-muted">
            Status
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "draft" | "published")
              }
              className={inputClass}
            >
              <option value="draft">Draft</option>
              <option value="published">Published in my story shelf</option>
            </select>
          </label>
        </section>

        <section className="mb-6 rounded-2xl border border-[#e9e2ef] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <WandSparkles className="text-[#7954a5]" size={18} />
            <h2 className="m-0 text-base font-bold">Make a draft with AI</h2>
          </div>
          <p className="mb-3 text-xs leading-5 text-muted">
            Optional. Describe the story you want and the app will draft original
            pages for you to edit. Available when an administrator has configured
            a provider key.
          </p>
          <textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="A shy little fox learns to ask for help when a storm arrives..."
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => void generateDraft()}
            disabled={generating || idea.trim().length < 3}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#eee5f6] px-4 py-2.5 text-sm font-semibold text-[#7954a5] disabled:opacity-50"
          >
            {generating ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            {generating ? "Writing draft..." : "Generate draft"}
          </button>
        </section>

        <section className="mb-6 rounded-2xl border border-[#e9e2ef] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-bold">Cover illustration</h2>
              <p className="mb-0 mt-1 text-xs text-muted">
                Upload an original image or a picture you have permission to use.
              </p>
            </div>
          </div>
          {coverImageUrl && (
            <img
              src={coverImageUrl}
              alt="Story cover"
              className="mb-3 h-40 w-32 rounded-xl object-cover"
            />
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#d9cce7] px-3 py-2.5 text-xs font-semibold text-[#7954a5]">
            <ImagePlus size={15} /> Upload cover image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadImage(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {!storyId && (
            <p className="mt-2 text-[11px] text-muted">
              Save the story first to enable image uploads.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-[#e9e2ef] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-bold">Story pages</h2>
              <p className="mb-0 mt-1 text-xs text-muted">
                Keep each page short and easy to read aloud.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={insertStarter}
                className="text-xs font-semibold text-[#7954a5] hover:underline"
              >
                Use a story starter
              </button>
              <span className="text-xs text-muted">{pages.length} pages</span>
            </div>
          </div>

          <div className="space-y-4">
            {pages.map((page, index) => (
              <div
                key={page.id || `new-${index}`}
                className="rounded-xl border border-[#eee8f3] bg-[#fcfbfd] p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#7954a5]">
                    Page {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => movePage(index, -1)}
                      disabled={index === 0}
                      className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-[#f2eafa] disabled:opacity-30"
                      aria-label={`Move page ${index + 1} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => movePage(index, 1)}
                      disabled={index === pages.length - 1}
                      className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-[#f2eafa] disabled:opacity-30"
                      aria-label={`Move page ${index + 1} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removePage(index)}
                      className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove page ${index + 1}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <textarea
                  value={page.content}
                  onChange={(event) => updatePage(index, event.target.value)}
                  rows={5}
                  maxLength={10000}
                  placeholder="Once upon a time..."
                  className="w-full resize-y rounded-xl border border-line bg-white p-3 text-sm leading-7 outline-none focus:border-[#9b7ac0]"
                />
                {page.imageUrl && (
                  <img
                    src={page.imageUrl}
                    alt={page.imageAlt || `Illustration for page ${index + 1}`}
                    className="my-3 max-h-56 rounded-xl object-contain"
                  />
                )}
                {storyId && page.id && (
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#d9cce7] px-3 py-2 text-xs font-semibold text-[#7954a5]">
                    <ImagePlus size={14} />
                    {page.imageUrl ? "Replace illustration" : "Add illustration"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadImage(file, index);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addPage}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-[#cbb9dc] px-4 py-3 text-sm font-semibold text-[#7954a5] hover:bg-[#faf7fd]"
          >
            <Plus size={16} /> Add another page
          </button>
        </section>

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <Link
            href="/story-time"
            className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-muted no-underline"
          >
            Cancel
          </Link>
          <div className="flex gap-2">
            {storyId && (
              <Link
                href={`/story-time/${storyId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[#d9cce7] bg-white px-4 py-3 text-sm font-semibold text-[#7954a5] no-underline"
              >
                <BookOpen size={16} /> Read story
              </Link>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-xl bg-[#7954a5] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save story"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
