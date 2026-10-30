import { describe, expect, it } from "vitest";

import { clampPage, parseRequestedPage } from "./page-query";

describe("parseRequestedPage", () => {
  it.each([
    { value: "3", expected: 3 },
    { value: " 3 ", expected: 3 },
    { value: "-4", expected: -4 },
    { value: "0", expected: 0 },
  ])("parses the decimal integer $value", ({ value, expected }) => {
    expect(parseRequestedPage(value)).toBe(expected);
  });

  it.each([
    "abc",
    "",
    "   ",
    "3.5",
    "0x10",
    "1e2",
    "+3",
    "NaN",
    "Infinity",
    "9007199254740992",
  ])("rejects the non-decimal value %j", (value) => {
    expect(parseRequestedPage(value)).toBeNull();
  });

  it("returns null when the query parameter is absent", () => {
    expect(parseRequestedPage(undefined)).toBeNull();
  });
});

describe("clampPage", () => {
  it("keeps a page inside a known range", () => {
    expect(clampPage(3, 5)).toBe(3);
    expect(clampPage(5, 5)).toBe(5);
  });

  it("clamps above the page count", () => {
    expect(clampPage(99, 5)).toBe(5);
  });

  it.each([0, -4])("clamps %i up to page 1", (page) => {
    expect(clampPage(page, 5)).toBe(1);
  });

  it.each([0, null, undefined])(
    "only enforces the lower bound when the page count is %j",
    (pageCount) => {
      expect(clampPage(99, pageCount)).toBe(99);
      expect(clampPage(0, pageCount)).toBe(1);
    }
  );
});
