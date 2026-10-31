"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Share, Smartphone, X } from "lucide-react";

import { shouldShowIosFullscreenHint } from "@/lib/ios-fullscreen";

type CopyState = "idle" | "copied" | "error";

export function IosFullscreenHint({
  buttonClassName,
}: {
  buttonClassName?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const navigatorStandalone = Boolean(
      (navigator as Navigator & { standalone?: boolean }).standalone
    );

    setVisible(
      shouldShowIosFullscreenHint({
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
        navigatorStandalone,
        displayModeStandalone: window.matchMedia(
          "(display-mode: standalone)"
        ).matches,
        displayModeFullscreen: window.matchMedia(
          "(display-mode: fullscreen)"
        ).matches,
      })
    );
  }, []);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!visible) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName}
        aria-haspopup="dialog"
        aria-label="How to get full screen on iPhone"
        title="How to get full screen on iPhone"
      >
        <Smartphone size={14} />
        <span>iPhone help</span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
              <button
                type="button"
                aria-label="Close full-screen help"
                className="absolute inset-0 bg-[#101612]/70 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="ios-fullscreen-title"
                className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#f7f8f4] p-6 text-ink shadow-2xl"
              >
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-4 top-4 rounded-full p-2 text-muted hover:bg-white hover:text-ink"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>

                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <Smartphone size={22} />
                </div>

                <h2
                  id="ios-fullscreen-title"
                  className="m-0 font-serif text-2xl font-bold"
                >
                  Full screen on iPhone
                </h2>
                <p className="mb-5 mt-2 text-sm leading-6 text-muted">
                  iPhone browsers cannot hide their own address bars. Install
                  ReadVault from Safari to read without browser controls.
                </p>

                <ol className="m-0 flex list-none flex-col gap-3 p-0 text-sm leading-6 text-ink">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                      1
                    </span>
                    <span>Copy this page&apos;s link.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                      2
                    </span>
                    <span>Open the link in Safari.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                      3
                    </span>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      Tap <Share size={15} className="text-brand" /> Share, then{" "}
                      <strong>Add to Home Screen</strong>.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                      4
                    </span>
                    <span>
                      Open ReadVault from the Home Screen icon and then open your
                      PDF.
                    </span>
                  </li>
                </ol>

                <p className="mt-5 rounded-xl bg-[#eef2ea] p-3 text-xs leading-5 text-muted">
                  Safari is required for Home Screen install on iPhone. The iOS
                  status bar may remain; native apps are the only way to hide it.
                </p>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white"
                  >
                    {copyState === "copied" ? (
                      <Check size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                    {copyState === "copied"
                      ? "Link copied"
                      : copyState === "error"
                        ? "Copy unavailable"
                        : "Copy link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-muted"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
