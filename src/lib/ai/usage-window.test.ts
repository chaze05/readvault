import { describe, expect, it } from "vitest";

import { usageDateKey, usageResetAt } from "./usage-window";

describe("AI usage window", () => {
  it("uses the UTC date for the usage key", () => {
    expect(usageDateKey(new Date("2026-10-30T23:59:59.000Z"))).toBe(
      "2026-10-30"
    );
    expect(usageDateKey(new Date("2026-10-30T00:00:00.000Z"))).toBe(
      "2026-10-30"
    );
    expect(usageDateKey(new Date("2026-10-30T23:59:59.999-05:00"))).toBe(
      "2026-10-31"
    );
  });

  it("resets at the next UTC midnight", () => {
    expect(
      usageResetAt(new Date("2026-10-30T23:59:59.000Z")).toISOString()
    ).toBe("2026-10-31T00:00:00.000Z");
    expect(
      usageResetAt(new Date("2026-10-30T00:00:00.000Z")).toISOString()
    ).toBe("2026-10-31T00:00:00.000Z");
    expect(
      usageResetAt(new Date("2026-12-31T12:00:00.000Z")).toISOString()
    ).toBe("2027-01-01T00:00:00.000Z");
  });
});
