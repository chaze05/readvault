export type CanvasMetrics = {
  cssWidth: number;
  backingWidth: number;
  pixelRatio: number;
};

const PHONE_SHORT_SIDE_MAX = 700;
const MAX_PIXEL_RATIO = 2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const SWIPE_MIN_DISTANCE = 50;
const SWIPE_HORIZONTAL_RATIO = 1.5;
export const READER_SWIPE_MAX_ZOOM = 1.05;

export function isPhoneReader(
  width: number,
  height: number,
  coarsePointer: boolean
): boolean {
  return coarsePointer && Math.min(width, height) <= PHONE_SHORT_SIDE_MAX;
}

export function getCanvasMetrics(
  cssWidth: number,
  devicePixelRatio: number
): CanvasMetrics {
  const pixelRatio = Math.min(
    MAX_PIXEL_RATIO,
    Math.max(1, Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1)
  );

  return {
    cssWidth,
    backingWidth: Math.round(cssWidth * pixelRatio),
    pixelRatio,
  };
}

export function clampReaderZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function getAutoImmersiveZoom(
  savedZoom: number,
  autoEnteringOnPhone: boolean
): number {
  return autoEnteringOnPhone ? 1 : clampReaderZoom(savedZoom);
}

export function getPageSwipeDirection({
  deltaX,
  deltaY,
  zoom,
  fingers,
}: {
  deltaX: number;
  deltaY: number;
  zoom: number;
  fingers: number;
}): "next" | "previous" | null {
  if (fingers !== 1) return null;
  if (!Number.isFinite(zoom) || zoom > READER_SWIPE_MAX_ZOOM) return null;
  if (
    !Number.isFinite(deltaX) ||
    !Number.isFinite(deltaY) ||
    Math.abs(deltaX) < SWIPE_MIN_DISTANCE ||
    Math.abs(deltaX) < SWIPE_HORIZONTAL_RATIO * Math.abs(deltaY)
  ) {
    return null;
  }

  return deltaX < 0 ? "next" : "previous";
}
