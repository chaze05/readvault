"use client";

import { FormEvent, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Upload, X, FileText, LoaderCircle } from "lucide-react";

const MAX_BYTES = 50 * 1024 * 1024;

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function UploadDialog({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("Uncategorized");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const cloudMode = process.env.NEXT_PUBLIC_STORAGE_DRIVER === "blob";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a PDF file first.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("PDF must be 50 MB or smaller.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const resolvedTitle =
        title.trim() || file.name.replace(/\.pdf$/i, "");

      if (cloudMode) {
        const buffer = await file.arrayBuffer();
        const fileHash = await sha256(buffer);
        const blob = await upload(
          `readvault/uploads/${crypto.randomUUID()}.pdf`,
          file,
          {
            access: "public",
            handleUploadUrl: "/api/blob/upload",
          }
        );

        const response = await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: resolvedTitle,
            author,
            category,
            fileName: file.name,
            fileHash,
            fileUrl: blob.url,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed.");
        }
      } else {
        const form = new FormData();
        form.append("file", file);
        form.append("title", resolvedTitle);
        form.append("author", author);
        form.append("category", category);

        const response = await fetch("/api/books", {
          method: "POST",
          body: form,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed.");
        }
      }

      onUploaded();
      onClose();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed."
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
              Add to your library
            </p>
            <h2 className="m-0 text-2xl font-bold">Upload a book</h2>
            <p className="mb-0 mt-2 text-sm text-muted">
              Choose a PDF and add a few details.
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
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              const chosen = event.target.files?.[0] || null;
              setFile(chosen);
              if (chosen && !title) {
                setTitle(chosen.name.replace(/\.pdf$/i, ""));
              }
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-[#dce4da] bg-[#fafbf8] px-5 py-8 text-center hover:border-brand"
          >
            {file ? (
              <FileText className="mb-2 text-brand" size={28} />
            ) : (
              <Upload className="mb-2 text-brand" size={28} />
            )}
            <span className="text-sm font-semibold">
              {file ? file.name : "Choose a PDF file"}
            </span>
            <span className="mt-1 text-xs text-muted">
              PDF only · Maximum 50 MB
            </span>
          </button>
          <label className="block text-sm font-medium">
            Book title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="block text-sm font-medium">
            Author
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Unknown author"
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
              {[
                "Uncategorized",
                "Programming",
                "Strategy",
                "Mathematics",
                "Data Science",
                "Business",
                "Artificial Intelligence",
                "Personal Development",
                "Other",
              ].map((item) => (
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
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#274a38] disabled:opacity-60"
            >
              {busy && <LoaderCircle className="animate-spin" size={16} />}
              {busy ? "Uploading..." : "Add to library"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
