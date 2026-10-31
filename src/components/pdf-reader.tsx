"use client";

import { useEffect, useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
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
  X,
} from "lucide-react";

import { BookmarkButton } from "@/components/bookmarks/bookmark-button";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import {
  clampReaderZoom,
  getCanvasMetrics,
  getPageSwipeDirection,
  isPhoneReader,
  READER_SWIPE_MAX_ZOOM,
} from "@/lib/reader-gestures";
import type { BookmarkItem } from "@/lib/types";

const PDF_CACHE = "readvault-pdfs-v2";
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const CONTROL_SELECTOR =
  'a[href], button, input, select, textarea, [role="button"], [contenteditable="true"]';

type TouchGesture = {
  mode: "swipe" | "pinch";
  onControl: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startZoom: number;
  startDistance: number;
};

function getFocusableElements(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((element) => element.getClientRects().length > 0);
}

function isControlTarget(target: EventTarget | null) {
  return (
    target instanceof Element && Boolean(target.closest(CONTROL_SELECTOR))
  );
}

function getTouchDistance(
  touches: ReactTouchEvent<HTMLDivElement>["touches"]
) {
  const first = touches[0];
  const second = touches[1];
  if (!first || !second) return 0;
  return Math.hypot(
    first.clientX - second.clientX,
    first.clientY - second.clientY
  );
}

type OfflineState = "checking" | "ready" | "online";

export function PdfReader({
  bookId,
  fileUrl,
  initialPage,
  initialTotalPages,
  initialZoom,
  title,
  isFavorite,
}: {
  bookId: string;
  fileUrl?: string;
  initialPage: number;
  initialTotalPages: number;
  initialZoom: number;
  title: string;
  isFavorite: boolean;
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(Math.max(1, initialPage));
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [zoom, setZoom] = useState(initialZoom);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [offlineState, setOfflineState] = useState<OfflineState>("checking");
  const [containerWidth, setContainerWidth] = useState(0);
  const [curtainLeaving, setCurtainLeaving] = useState(false);
  const [curtainVisible, setCurtainVisible] = useState(true);
  const [isPhone, setIsPhone] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
  const autoImmersiveApplied = useRef(false);
  const restoreFocusOnClose = useRef(false);
  const gestureRef = useRef<TouchGesture | null>(null);
  const pinchFrameRef = useRef<number | null>(null);
  const pendingZoomRef = useRef<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");

    function updatePhone() {
      setIsPhone(
        isPhoneReader(window.innerWidth, window.innerHeight, query.matches)
      );
    }

    updatePhone();
    window.addEventListener("resize", updatePhone);
    window.addEventListener("orientationchange", updatePhone);

    return () => {
      window.removeEventListener("resize", updatePhone);
      window.removeEventListener("orientationchange", updatePhone);
    };
  }, []);

  useEffect(() => {
    if (!isPhone || !pdf || loading || error || autoImmersiveApplied.current) {
      return;
    }

    autoImmersiveApplied.current = true;
    setImmersive(true);
  }, [isPhone, pdf, loading, error]);

  useEffect(() => {
    return () => {
      if (pinchFrameRef.current !== null) {
        window.cancelAnimationFrame(pinchFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    element.scrollTop = 0;
    element.scrollLeft = 0;
  }, [pageNumber]);

  useEffect(() => {
    if (!immersive) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousOverscroll = body.style.overscrollBehavior;
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previousOverflow;
      body.style.overscrollBehavior = previousOverscroll;
    };
  }, [immersive]);

  useEffect(() => {
    if (!immersive) return;

    const overlay = shellRef.current;
    if (!overlay) return;

    const hidden = new Map<
      HTMLElement,
      { ariaHidden: string | null; hadInert: boolean }
    >();

    function hide(element: HTMLElement) {
      if (element === overlay || hidden.has(element)) return;
      hidden.set(element, {
        ariaHidden: element.getAttribute("aria-hidden"),
        hadInert: element.hasAttribute("inert"),
      });
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    }

    let node: HTMLElement = overlay;
    while (node.parentElement && node.parentElement !== document.body) {
      const parent = node.parentElement;
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== node && sibling instanceof HTMLElement) {
          hide(sibling);
        }
      }
      node = parent;
    }

    for (const sibling of Array.from(document.body.children)) {
      if (sibling !== node && sibling instanceof HTMLElement) {
        hide(sibling);
      }
    }

    return () => {
      for (const [element, state] of hidden) {
        if (state.hadInert) element.setAttribute("inert", "");
        else element.removeAttribute("inert");
        if (state.ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", state.ariaHidden);
      }
    };
  }, [immersive]);

  useEffect(() => {
    if (!immersive) {
      if (!restoreFocusOnClose.current) return;
      restoreFocusOnClose.current = false;
      const frame = window.requestAnimationFrame(() =>
        fullscreenButtonRef.current?.focus()
      );
      return () => window.cancelAnimationFrame(frame);
    }

    const frame = window.requestAnimationFrame(() =>
      closeButtonRef.current?.focus()
    );
    return () => window.cancelAnimationFrame(frame);
  }, [immersive]);

  useEffect(() => {
    if (!immersive) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;

      const overlay = shellRef.current;
      if (!overlay) return;

      const focusable = getFocusableElements(overlay);
      if (focusable.length === 0) {
        event.preventDefault();
        overlay.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!(active instanceof HTMLElement) || !overlay.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [immersive]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const target = element;

    function measure() {
      const styles = window.getComputedStyle(target);
      const horizontalPadding =
        parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      setContainerWidth(Math.max(target.clientWidth - horizontalPadding, 0));
    }

    const observer = new ResizeObserver(measure);
    observer.observe(target);
    measure();
    const frame = window.requestAnimationFrame(measure);

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [immersive]);

  useEffect(() => {
    let cancelled = false;

    async function loadBookmarks() {
      try {
        const response = await fetch(
          `/api/bookmarks?bookId=${encodeURIComponent(bookId)}`,
          { cache: "no-store" }
        );
        if (!response.ok) return;
        const data = (await response.json()) as BookmarkItem[];
        if (!cancelled && Array.isArray(data)) setBookmarks(data);
      } catch {}
    }

    void loadBookmarks();

    return () => {
      cancelled = true;
    };
  }, [bookId]);

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
    if (!pdf || containerWidth <= 0) return;

    let cancelled = false;
    let renderTask: RenderTask | null = null;
    let renderFinished = false;

    async function render() {
      try {
        const page = await pdf!.getPage(pageNumber);
        if (cancelled) return;

        const base = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(1, Math.floor(containerWidth));
        const fitScale = availableWidth / base.width;
        const viewport = page.getViewport({ scale: fitScale * zoom });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const cssHeight = Math.floor(viewport.height);
        const metrics = getCanvasMetrics(
          Math.floor(viewport.width),
          window.devicePixelRatio
        );

        canvas.width = metrics.backingWidth;
        canvas.height = Math.floor(cssHeight * metrics.pixelRatio);
        canvas.style.width = `${metrics.cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        renderTask = page.render({
          canvas,
          viewport,
          transform:
            metrics.pixelRatio === 1
              ? undefined
              : [metrics.pixelRatio, 0, 0, metrics.pixelRatio, 0, 0],
        });
        await renderTask.promise;
      } catch {
        if (!cancelled) setError("Could not render this page.");
      } finally {
        renderFinished = true;
      }
    }

    void render();

    return () => {
      cancelled = true;
      if (!renderFinished) renderTask?.cancel();
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

  function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    if (!immersive) return;

    const first = event.touches[0];
    if (!first) return;

    if (event.touches.length >= 2) {
      gestureRef.current = {
        mode: "pinch",
        onControl:
          gestureRef.current?.onControl ?? isControlTarget(event.target),
        startX: first.clientX,
        startY: first.clientY,
        lastX: first.clientX,
        lastY: first.clientY,
        startZoom: zoom,
        startDistance: getTouchDistance(event.touches),
      };
      return;
    }

    gestureRef.current = {
      mode: "swipe",
      onControl: isControlTarget(event.target),
      startX: first.clientX,
      startY: first.clientY,
      lastX: first.clientX,
      lastY: first.clientY,
      startZoom: zoom,
      startDistance: 0,
    };
  }

  function handleTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.onControl) return;

    const first = event.touches[0];
    if (!first) return;

    if (gesture.mode === "pinch" || event.touches.length >= 2) {
      if (gesture.mode !== "pinch") {
        gesture.mode = "pinch";
        gesture.startZoom = zoom;
        gesture.startDistance = getTouchDistance(event.touches);
        return;
      }

      const distance = getTouchDistance(event.touches);
      if (gesture.startDistance <= 0 || distance <= 0) return;

      pendingZoomRef.current = clampReaderZoom(
        gesture.startZoom * (distance / gesture.startDistance)
      );
      if (pinchFrameRef.current === null) {
        pinchFrameRef.current = window.requestAnimationFrame(() => {
          pinchFrameRef.current = null;
          const pending = pendingZoomRef.current;
          pendingZoomRef.current = null;
          if (pending !== null) setZoom(Number(pending.toFixed(3)));
        });
      }
      return;
    }

    gesture.lastX = first.clientX;
    gesture.lastY = first.clientY;
  }

  function handleTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    gestureRef.current = null;

    if (!gesture || !immersive || gesture.onControl || gesture.mode !== "swipe") {
      return;
    }

    const touch = event.changedTouches[0];
    const direction = getPageSwipeDirection({
      deltaX: (touch?.clientX ?? gesture.lastX) - gesture.startX,
      deltaY: (touch?.clientY ?? gesture.lastY) - gesture.startY,
      zoom: gesture.startZoom,
      fingers: 1,
    });

    if (direction === "next") {
      goToPage(pageNumber + 1);
    } else if (direction === "previous") {
      goToPage(pageNumber - 1);
    }
  }

  function handleTouchCancel() {
    gestureRef.current = null;
    pendingZoomRef.current = null;
  }

  function goToPage(value: number) {
    const max = totalPages || 1;
    setPageNumber(Math.min(Math.max(1, Math.round(value)), max));
  }

  function handleBookmarkChange(
    bookmark: BookmarkItem | null,
    changedPage: number
  ) {
    setBookmarks((current) => {
      const remaining = current.filter(
        (item) =>
          item.pageNumber !== changedPage && item.id !== bookmark?.id
      );
      return bookmark ? [bookmark, ...remaining] : remaining;
    });
  }

  const pageBookmark = bookmarks.find(
    (bookmark) => bookmark.pageNumber === pageNumber
  );

  async function toggleFullscreen() {
    const target = immersive ? shellRef.current : containerRef.current;
    if (!target) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (target.requestFullscreen) {
        await target.requestFullscreen();
      }
    } catch {
      // Native fullscreen can be blocked by the browser; the overlay remains.
    }
  }

  async function closeImmersive() {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Continue closing the overlay even if the browser rejects the exit.
      }
    }
    restoreFocusOnClose.current = true;
    setImmersive(false);
  }

  const controlClass = immersive
    ? "inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    : "inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-line bg-white px-2.5 text-xs font-semibold text-muted transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40";

  const pageInputClass = immersive
    ? "h-9 w-14 rounded-lg border border-white/15 bg-white/10 px-2 text-center text-xs font-semibold text-white outline-none focus:border-white/50"
    : "h-9 w-14 rounded-lg border border-line bg-white px-2 text-center text-xs font-semibold outline-none focus:border-brand";

  const offlineLabel =
    offlineState === "ready"
      ? "Offline ready"
      : offlineState === "checking"
        ? "Checking cache"
        : "Online only";

  const offlineBadgeClass = immersive
    ? "bg-white/10 text-white/80"
    : offlineState === "ready"
      ? "bg-brand-soft text-brand"
      : "bg-paper text-muted";

  const touchAction = immersive
    ? zoom > READER_SWIPE_MAX_ZOOM
      ? "pan-x pan-y"
      : "pan-y"
    : undefined;

  return (
    <div
      ref={shellRef}
      role={immersive ? "dialog" : undefined}
      aria-modal={immersive ? true : undefined}
      aria-label={immersive ? `${title} reader` : undefined}
      tabIndex={immersive ? -1 : undefined}
      className={
        immersive
          ? "reader-immersive fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden text-white"
          : "relative overflow-hidden rounded-2xl border border-line bg-white shadow-soft"
      }
    >
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

      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5 ${
          immersive ? "border-white/10 bg-[#101612]" : "border-line"
        }`}
      >
        <div className="flex items-center gap-1.5">
          {immersive && (
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => void closeImmersive()}
              className={controlClass}
              aria-label="Close immersive reader"
            >
              <X size={16} />
            </button>
          )}
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
            className={pageInputClass}
            aria-label="Current page"
          />
          <span
            className={`text-xs ${immersive ? "text-white/60" : "text-muted"}`}
          >
            / {totalPages || "…"}
          </span>
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
          <BookmarkButton
            key={`bookmark-${pageNumber}`}
            kind="book"
            targetId={bookId}
            pageNumber={pageNumber}
            initialBookmarked={Boolean(pageBookmark)}
            initialBookmarkId={pageBookmark?.id}
            onChange={handleBookmarkChange}
          />
          <FavoriteButton
            kind="book"
            targetId={bookId}
            initialFavorite={isFavorite}
          />
          <span
            className={`mr-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${offlineBadgeClass}`}
            title={offlineLabel}
          >
            {offlineState === "ready" ? (
              <CheckCircle2 size={12} />
            ) : (
              <WifiOff size={12} />
            )}
            <span className={immersive ? "sr-only" : undefined}>
              {offlineLabel}
            </span>
          </span>
          <button
            type="button"
            onClick={() =>
              setZoom((value) =>
                clampReaderZoom(Number((value - 0.1).toFixed(1)))
              )
            }
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
            onClick={() =>
              setZoom((value) =>
                clampReaderZoom(Number((value + 0.1).toFixed(1)))
              )
            }
            className={controlClass}
            aria-label="Zoom in"
          >
            <Plus size={14} />
          </button>
          <span
            className={`w-10 text-center text-[10px] font-semibold ${
              immersive ? "text-white/60" : "text-muted"
            }`}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            ref={fullscreenButtonRef}
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={touchAction ? { touchAction } : undefined}
        className={
          immersive
            ? "reader-immersive-viewport"
            : "relative max-h-[calc(100vh-165px)] min-h-[60vh] overflow-auto bg-[#e8ebe4] p-4"
        }
      >
        {loading && (
          <div
            className={`flex min-h-[50vh] items-center justify-center gap-2 text-sm ${
              immersive ? "text-white/70" : "text-muted"
            }`}
          >
            <LoaderCircle className="animate-spin" size={18} /> Loading PDF...
          </div>
        )}

        {error && !loading && (
          <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-6 text-center text-sm text-red-700 shadow-soft">
            {error}
          </div>
        )}

        <canvas
          key={pageNumber}
          ref={canvasRef}
          className={`reader-page-enter mx-auto block shadow-lg ${loading || error ? "hidden" : ""}`}
        />
      </div>

      <div
        className={`flex items-center justify-between gap-3 border-t px-4 py-2 text-[11px] ${
          immersive ? "border-white/10 text-white/60" : "border-line text-muted"
        }`}
      >
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
