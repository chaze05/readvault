"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import type { BookmarkKind } from "@/lib/types";

export function FavoriteButton({
  kind,
  targetId,
  initialFavorite,
  className,
}: {
  kind: BookmarkKind;
  targetId: string;
  initialFavorite: boolean;
  className?: string;
}) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setIsFavorite(initialFavorite);
  }, [initialFavorite]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(""), 4000);
    return () => window.clearTimeout(timer);
  }, [error]);

  async function toggle() {
    const nextFavorite = !isFavorite;
    setIsFavorite(nextFavorite);
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/favorites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          id: targetId,
          isFavorite: nextFavorite,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Could not update this favorite.");
      }
    } catch (toggleError) {
      setIsFavorite(!nextFavorite);
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Could not update this favorite."
      );
    } finally {
      setPending(false);
    }
  }

  const noun = kind === "book" ? "book" : "story";

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={pending}
        aria-label={
          isFavorite ? `Remove ${noun} from favorites` : `Add ${noun} to favorites`
        }
        aria-pressed={isFavorite}
        title={
          isFavorite ? `Remove ${noun} from favorites` : `Add ${noun} to favorites`
        }
        className={`inline-flex h-9 items-center justify-center rounded-lg border px-2.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
          isFavorite
            ? "border-[#d46a7a] bg-[#fdeef1] text-[#b33d52]"
            : "border-line bg-white text-muted hover:border-[#d46a7a] hover:text-[#b33d52]"
        }`}
      >
        <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
      </button>

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
