import { describe, expect, it } from "vitest";

import { DEFAULT_PREFERENCES } from "./preferences";
import { preferencesSchema } from "./validation";

describe("DEFAULT_PREFERENCES", () => {
  it("starts at 100% zoom, medium story text, and system motion", () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      pdfZoom: 100,
      storyTextSize: "medium",
      reduceMotion: false,
    });
  });
});

describe("preferencesSchema", () => {
  it.each([75, 100, 125, 150] as const)("accepts %i%% PDF zoom", (pdfZoom) => {
    const result = preferencesSchema.safeParse({
      pdfZoom,
      storyTextSize: "medium",
      reduceMotion: false,
    });

    expect(result.success).toBe(true);
  });

  it.each(["small", "medium", "large"] as const)(
    "accepts %s story text size",
    (storyTextSize) => {
      const result = preferencesSchema.safeParse({
        pdfZoom: 100,
        storyTextSize,
        reduceMotion: false,
      });

      expect(result.success).toBe(true);
    }
  );

  it("accepts both reduced-motion values", () => {
    for (const reduceMotion of [true, false]) {
      const result = preferencesSchema.safeParse({
        pdfZoom: 100,
        storyTextSize: "medium",
        reduceMotion,
      });

      expect(result.success).toBe(true);
    }
  });

  it.each([50, 80, 110, 175] as const)(
    "rejects %i%% PDF zoom",
    (pdfZoom) => {
      const result = preferencesSchema.safeParse({
        pdfZoom,
        storyTextSize: "medium",
        reduceMotion: false,
      });

      expect(result.success).toBe(false);
    }
  );

  it("rejects an unknown story text size", () => {
    const result = preferencesSchema.safeParse({
      pdfZoom: 100,
      storyTextSize: "huge",
      reduceMotion: false,
    });

    expect(result.success).toBe(false);
  });
});
