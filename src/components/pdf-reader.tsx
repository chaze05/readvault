"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Maximize,
  Minus,
  Plus,
  WifiOff,
} from "lucide-react";

const PDF_CACHE = "readvault-pdfs";

type OfflineState = "checking" | "ready" | "online";

export function PdfReader({
  bookId,
  fileUrl,
  initialPage,
  initialTotalPages,
  title,
}: {
  bookId: string;
  fileUrl?: string;
  initialPage: number;
  initialTotalPages: number;
  title: string;
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(Math.max(1, initialPage));
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [offlineState, setOfflineState] = useState<OfflineState>("checking");
  const [containerWidth, setContainerWidth] = useState(0);
  const [curtainLeaving, setCurtainLeaving] = useState(false);
  const [curtainVisible, setCurtainVisible] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0]?.contentRect.width ?? element.clientWidth);
    });
    observer.observe(element);
    setContainerWidth(element.clientWidth);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadedDocument: PDFDocumentProxy | null = null;

    async function load() {
      setLoading(true);
      setError("");
      setOfflineState("checking");

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const url = fileUrl ?? `/api/books/${bookId}/file`;
        let data: ArrayBuffer | null = null;

        if ("caches" in window) {
          try {
            const cache = await caches.open(PDF_CACHE);
            const cached = await cache.match(url);

            if (cached) {
              data = await cached.arrayBuffer();
              setOfflineState("ready");
            } else {
              const response = await fetch(url);
              if (!response.ok) throw new Error("Could not load this PDF.");

              data = await response.arrayBuffer();
              try {
                await cache.put(url, new Response(data.slice(0)));
                setOfflineState("ready");
              } catch {
                setOfflineState("online");
              }
            }
          } catch {
            data = null;
          }
        }

        if (!data) {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(
              "This PDF is not available offline yet. Open it online once to cache it."
            );
          }
          data = await response.arrayBuffer();
          setOfflineState("online");
        }

        const document = await pdfjs.getDocument({ data: new Uint8Array(data) })
          .promise;

        if (cancelled) {
          void document.cleanup();
          return;
        }

        loadedDocument = document;
        setPdf(document);
        setTotalPages(document.numPages);
        setPageNumber((current) =>
          Math.min(Math.max(current, 1), document.numPages)
        );

        // Warm the full reader HTML so a later offline navigation has a shell,
        // not just the client-side RSC transition.
        void fetch(window.location.pathname, {
          headers: { "x-readvault-warm": "1" },
        }).catch(() => {});

        if (navigator.storage?.persist) void navigator.storage.persist();
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load this PDF."
          );
          setCurtainVisible(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      void loadedDocument?.cleanup();
    };
  }, [bookId, fileUrl]);

  useEffect(() => {
    if (loading || error) return;

    const timer = window.setTimeout(() => {
      setCurtainLeaving(true);
      window.setTimeout(() => setCurtainVisible(false), 600);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [loading, error]);

  useEffect(() => {
    if (!pdf) return;

    let cancelled = false;

    async function render() {
      try {
        const page = await pdf!.getPage(pageNumber);
        if (cancelled) return;

        const base = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(containerWidth - 32, 280);
        const fitScale = Math.min(2, Math.max(0.4, availableWidth / base.width));
        const viewport = page.getViewport({ scale: fitScale * zoom });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        await page.render({ canvas, viewport }).promise;
      } catch {
        if (!cancelled) setError("Could not render this page.");
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, zoom, containerWidth]);

  useEffect(() => {
    if (!pdf) return;

    setSaved(false);
    const timer = window.setTimeout(async () => {
      setSaving(true);
      try {
        const response = await fetch(`/api/books/${bookId}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPage: pageNumber, totalPages }),
        });
        if (response.ok) setSaved(true);
      } catch {
        // Progress will retry on the next page change.
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [pdf, pageNumber, totalPages, bookId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;

      if (event.key === "ArrowRight") {
        setPageNumber((current) => Math.min(totalPages || current, current + 1));
      } else if (event.key === "ArrowLeft") {
        setPageNumber((current) => Math.max(1, current - 1));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [totalPages]);

  function goToPage(value: number) {
    const max = totalPages || 1;
    setPageNumber(Math.min(Math.max(1, Math.round(value)), max));
  }

  async function toggleFullscreen() {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    } else {
      await containerRef.current.requestFullscreen?.();
    }
  }

  const controlClass =
    "inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-line bg-white px-2.5 text-xs font-semibold text-muted transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      {curtainVisible && (
        <div className={`reader-curtain ${curtainLeaving ? "leaving" : ""}`}>
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
              <BookOpen size={34} />
            </div>
            <p className="curtain-kicker">Story time</p>
            <h2 className="curtain-title">{title}</h2>
            <p className="curtain-note">
              Take a breath. The next page is waiting.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => goToPage(pageNumber - 1)}
            disabled={pageNumber <= 1 || loading}
            className={controlClass}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <input
            type="number"
            min={1}
            max={totalPages || undefined}
            value={pageNumber}
            onChange={(event) => goToPage(Number(event.target.value))}
            disabled={loading || !totalPages}
            className="h-9 w-14 rounded-lg border border-line bg-white px-2 text-center text-xs font-semibold outline-none focus:border-brand"
            aria-label="Current page"
          />
          <span className="text-xs text-muted">/ {totalPages || "…"}</span>
          <button
            type="button"
            onClick={() => goToPage(pageNumber + 1)}
            disabled={pageNumber >= totalPages || loading}
            className={controlClass}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`mr-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
              offlineState === "ready"
                ? "bg-brand-soft text-brand"
                : "bg-paper text-muted"
            }`}
          >
            {offlineState === "ready" ? (
              <CheckCircle2 size={12} />
            ) : (
              <WifiOff size={12} />
            )}
            {offlineState === "ready"
              ? "Offline ready"
              : offlineState === "checking"
                ? "Checking cache"
                : "Online only"}
          </span>
          <button
            type="button"
            onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.1).toFixed(1))))}
            className={controlClass}
            aria-label="Zoom out"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className={controlClass}
            aria-label="Fit width"
          >
            Fit
          </button>
          <button
            type="button"
            onClick={() => setZoom((value) => Math.min(3, Number((value + 0.1).toFixed(1))))}
            className={controlClass}
            aria-label="Zoom in"
          >
            <Plus size={14} />
          </button>
          <span className="w-10 text-center text-[10px] font-semibold text-muted">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className={controlClass}
            aria-label="Toggle fullscreen"
          >
            <Maximize size={14} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative max-h-[calc(100vh-165px)] min-h-[60vh] overflow-auto bg-[#e8ebe4] p-4"
      >
        {loading && (
          <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted">
            <LoaderCircle className="animate-spin" size={18} /> Loading PDF...
          </div>
        )}

        {error && !loading && (
          <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-6 text-center text-sm text-red-700 shadow-soft">
            {error}
          </div>
        )}

        <canvas
          key={`${pageNumber}-${zoom}`}
          ref={canvasRef}
          className={`reader-page-enter mx-auto block shadow-lg ${loading || error ? "hidden" : ""}`}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2 text-[11px] text-muted">
        <span>
          {saving
            ? "Saving progress..."
            : saved
              ? "Progress saved"
              : "Progress saves automatically"}
        </span>
        <span className="hidden sm:inline">
          Use arrow keys to turn pages
        </span>
      </div>
    </div>
  );
}
