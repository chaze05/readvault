export type CanvasMetrics = {
  cssWidth: number;
  backingWidth: number;
  pixelRatio: number;
};

const PHONE_SHORT_SIDE_MAX = 700;
const MAX_PIXEL_RATIO = 2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

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
