"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save } from "lucide-react";

import { updatePreferencesAction } from "@/actions/settings";
import type { UserPreferences } from "@/lib/preferences";

const ZOOM_OPTIONS = [75, 100, 125, 150] as const;

const TEXT_SIZE_OPTIONS = [
  { value: "small", label: "Small", sample: "text-sm" },
  { value: "medium", label: "Medium", sample: "text-base" },
  { value: "large", label: "Large", sample: "text-lg" },
] as const;

export function ReadingForm({
  initialPreferences,
}: {
  initialPreferences: UserPreferences;
}) {
  const router = useRouter();
  const [pdfZoom, setPdfZoom] = useState(initialPreferences.pdfZoom);
  const [storyTextSize, setStoryTextSize] = useState(
    initialPreferences.storyTextSize
  );
  const [reduceMotion, setReduceMotion] = useState(
    initialPreferences.reduceMotion
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    setPending(true);

    try {
      const formData = new FormData();
      formData.set("pdfZoom", String(pdfZoom));
      formData.set("storyTextSize", storyTextSize);
      formData.set("reduceMotion", reduceMotion ? "true" : "false");

      const result = await updatePreferencesAction(formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setSaved(true);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-7">
      <fieldset className="m-0 border-0 p-0">
        <legend className="text-sm font-bold text-ink">PDF zoom</legend>
        <p className="mb-0 mt-1 text-xs leading-5 text-muted">
          The zoom level a PDF opens at in the normal reader. Phone immersive
          mode always starts at Fit width; you can still adjust zoom there.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ZOOM_OPTIONS.map((value) => {
            const active = pdfZoom === value;

            return (
              <label
                key={value}
                className={`inline-flex cursor-pointer items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line bg-white text-muted hover:border-brand hover:text-brand"
                }`}
              >
                <input
                  type="radio"
                  name="pdfZoom"
                  value={value}
                  checked={active}
                  onChange={() => {
                    setPdfZoom(value);
                    setSaved(false);
                  }}
                  className="sr-only"
                  disabled={pending}
                />
                {value}%
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0">
        <legend className="text-sm font-bold text-ink">Story text size</legend>
        <p className="mb-0 mt-1 text-xs leading-5 text-muted">
          Choose how large story pages appear when you read together.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TEXT_SIZE_OPTIONS.map((option) => {
            const active = storyTextSize === option.value;

            return (
              <label
                key={option.value}
                className={`inline-flex cursor-pointer items-center justify-center rounded-xl border px-4 py-2.5 font-semibold transition ${
                  option.sample
                } ${
                  active
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line bg-white text-muted hover:border-brand hover:text-brand"
                }`}
              >
                <input
                  type="radio"
                  name="storyTextSize"
                  value={option.value}
                  checked={active}
                  onChange={() => {
                    setStoryTextSize(option.value);
                    setSaved(false);
                  }}
                  className="sr-only"
                  disabled={pending}
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-paper p-4">
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={(event) => {
            setReduceMotion(event.target.checked);
            setSaved(false);
          }}
          className="mt-0.5 h-4 w-4 accent-[#315b45]"
          disabled={pending}
        />
        <span>
          <span className="block text-sm font-semibold text-ink">
            Reduce motion
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted">
            Turn off the reader curtain, sparkles, and page-turn animations.
          </span>
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="m-0 rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#274a38] disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save preferences
        </button>

        {saved && (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
          >
            <Check size={16} />
            Preferences saved
          </span>
        )}
      </div>
    </form>
  );
}
