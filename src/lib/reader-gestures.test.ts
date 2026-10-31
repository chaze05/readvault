import { describe, expect, it } from "vitest";

import {
  clampReaderZoom,
  getCanvasMetrics,
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
