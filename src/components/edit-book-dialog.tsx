"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, Pencil, X } from "lucide-react";

import type { Book } from "@/lib/types";

const categories = [
  "Uncategorized",
  "Programming",
  "Strategy",
  "Mathematics",
  "Data Science",
  "Business",
  "Artificial Intelligence",
  "Personal Development",
  "Other",
];

export function EditBookDialog({
  book,
  onClose,
  onSaved,
}: {
  book: Book;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [category, setCategory] = useState(book.category);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author, category }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not update this book.");
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not update this book."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#17231b]/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand">
              Book details
            </p>
            <h2 className="m-0 flex items-center gap-2 text-2xl font-bold">
              <Pencil size={19} /> Edit book
            </h2>
            <p className="mb-0 mt-2 text-sm text-muted">
              Update the metadata shown in your library.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-paper"
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">
            Book title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={300}
              className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="block text-sm font-medium">
            Author
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              maxLength={200}
              className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="block text-sm font-medium">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          {error && (
            <p className="m-0 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted hover:bg-paper"
            >
              Cancel
            </button>
            <button
              disabled={busy || !title.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#274a38] disabled:opacity-60"
            >
              {busy && <LoaderCircle className="animate-spin" size={16} />}
              {busy ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
