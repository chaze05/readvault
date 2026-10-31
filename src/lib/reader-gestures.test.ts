import { describe, expect, it } from "vitest";

import {
  clampReaderZoom,
  getCanvasMetrics,
  getPageSwipeDirection,
  isPhoneReader,
} from "./reader-gestures";

describe("isPhoneReader", () => {
  it("detects a portrait phone with a coarse pointer", () => {
    expect(isPhoneReader(390, 844, true)).toBe(true);
  });

  it("detects a landscape phone with a coarse pointer", () => {
    expect(isPhoneReader(844, 390, true)).toBe(true);
  });

  it("rejects a desktop viewport with a fine pointer", () => {
    expect(isPhoneReader(1440, 900, false)).toBe(false);
  });

  it("rejects a short viewport without a coarse pointer", () => {
    expect(isPhoneReader(390, 844, false)).toBe(false);
  });

  it("rejects a coarse-pointer tablet whose short side exceeds 700", () => {
    expect(isPhoneReader(820, 1180, true)).toBe(false);
  });

  it("treats the 700px short-side boundary as a phone", () => {
    expect(isPhoneReader(700, 1200, true)).toBe(true);
  });
});

describe("getCanvasMetrics", () => {
  it("caps the backing store at twice the CSS width", () => {
    expect(getCanvasMetrics(390, 3)).toEqual({
      cssWidth: 390,
      backingWidth: 780,
      pixelRatio: 2,
    });
  });

  it("keeps the device ratio for standard displays", () => {
    expect(getCanvasMetrics(640, 1)).toEqual({
      cssWidth: 640,
      backingWidth: 640,
      pixelRatio: 1,
    });
  });

  it("never drops below a 1x backing store", () => {
    expect(getCanvasMetrics(320, 0.75)).toEqual({
      cssWidth: 320,
      backingWidth: 320,
      pixelRatio: 1,
    });
  });

  it("rounds fractional backing widths", () => {
    expect(getCanvasMetrics(390.4, 1.5)).toEqual({
      cssWidth: 390.4,
      backingWidth: 586,
      pixelRatio: 1.5,
    });
  });
});

describe("clampReaderZoom", () => {
  it("caps zoom at 3", () => {
    expect(clampReaderZoom(10)).toBe(3);
  });

  it("floors zoom at 0.5", () => {
    expect(clampReaderZoom(0.1)).toBe(0.5);
  });

  it("keeps values inside the range", () => {
    expect(clampReaderZoom(1.25)).toBe(1.25);
  });
});

describe("getPageSwipeDirection", () => {
  it("turns to the next page on a left swipe", () => {
    expect(
      getPageSwipeDirection({ deltaX: -80, deltaY: 20, zoom: 1, fingers: 1 })
    ).toBe("next");
  });

  it("turns to the previous page on a right swipe", () => {
    expect(
      getPageSwipeDirection({ deltaX: 80, deltaY: 20, zoom: 1, fingers: 1 })
    ).toBe("previous");
  });

  it("does not page while zoomed in", () => {
    expect(
      getPageSwipeDirection({ deltaX: -80, deltaY: 20, zoom: 1.2, fingers: 1 })
    ).toBeNull();
  });

  it("does not page on a vertical swipe", () => {
    expect(
      getPageSwipeDirection({ deltaX: 0, deltaY: 100, zoom: 1, fingers: 1 })
    ).toBeNull();
  });

  it("does not page with two fingers", () => {
    expect(
      getPageSwipeDirection({ deltaX: -80, deltaY: 20, zoom: 1, fingers: 2 })
    ).toBeNull();
  });

  it("does not page without a finger", () => {
    expect(
      getPageSwipeDirection({ deltaX: -80, deltaY: 20, zoom: 1, fingers: 0 })
    ).toBeNull();
  });

  it("accepts a swipe exactly at the 50px threshold", () => {
    expect(
      getPageSwipeDirection({ deltaX: -50, deltaY: 0, zoom: 1, fingers: 1 })
    ).toBe("next");
  });

  it("ignores a swipe just under the 50px threshold", () => {
    expect(
      getPageSwipeDirection({ deltaX: -49, deltaY: 0, zoom: 1, fingers: 1 })
    ).toBeNull();
  });

  it("accepts a swipe exactly at the 1.5 horizontal ratio", () => {
    expect(
      getPageSwipeDirection({ deltaX: -75, deltaY: 50, zoom: 1, fingers: 1 })
    ).toBe("next");
  });

  it("ignores a diagonal swipe under the 1.5 horizontal ratio", () => {
    expect(
      getPageSwipeDirection({ deltaX: -74, deltaY: 50, zoom: 1, fingers: 1 })
    ).toBeNull();
  });

  it("allows swiping at the 1.05 zoom boundary", () => {
    expect(
      getPageSwipeDirection({ deltaX: 80, deltaY: 20, zoom: 1.05, fingers: 1 })
    ).toBe("previous");
  });

  it("does not page just above the 1.05 zoom boundary", () => {
    expect(
      getPageSwipeDirection({ deltaX: 80, deltaY: 20, zoom: 1.06, fingers: 1 })
    ).toBeNull();
  });
});
