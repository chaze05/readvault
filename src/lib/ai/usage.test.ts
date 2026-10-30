import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

import { query } from "@/lib/db";

import { refundAiDraft, reserveAiDraft } from "./usage";

const beforeReset = new Date("2026-10-30T23:59:59.000Z");
const afterReset = new Date("2026-10-31T00:00:00.000Z");

describe("reserveAiDraft", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("allows a reservation at the limit and reports the UTC reset", async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ count: 5 }] } as never);

    await expect(reserveAiDraft("user-1", 5, beforeReset)).resolves.toEqual({
      allowed: true,
      used: 5,
      limit: 5,
      resetAt: new Date("2026-10-31T00:00:00.000Z"),
    });

    const [sql, params] = vi.mocked(query).mock.calls[0];
    expect(sql).toContain("where current_usage.count < $3");
    expect(params).toEqual(["user-1", "2026-10-30", 5]);
  });

  it("denies a reservation after the limit", async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [{ count: 5 }] } as never);

    await expect(reserveAiDraft("user-1", 5, beforeReset)).resolves.toEqual({
      allowed: false,
      used: 5,
      limit: 5,
      resetAt: new Date("2026-10-31T00:00:00.000Z"),
    });

    const [selectSql, selectParams] = vi.mocked(query).mock.calls[1];
    expect(selectSql).toContain("where user_id = $1 and usage_date = $2");
    expect(selectParams).toEqual(["user-1", "2026-10-30"]);
  });

  it("uses a minimum limit of one", async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ count: 1 }] } as never);

    await expect(reserveAiDraft("user-1", 0, beforeReset)).resolves.toEqual({
      allowed: true,
      used: 1,
      limit: 1,
      resetAt: new Date("2026-10-31T00:00:00.000Z"),
    });
  });
});

describe("refundAiDraft", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
  });

  it("never drops below zero", async () => {
    await refundAiDraft("user-1", beforeReset);

    const [sql, params] = vi.mocked(query).mock.calls[0];
    expect(sql).toContain("set count = count - 1");
    expect(sql).toContain("count > 0");
    expect(params).toEqual(["user-1", "2026-10-30"]);
  });

  it("uses the UTC date on both sides of midnight", async () => {
    await refundAiDraft("user-1", beforeReset);
    await refundAiDraft("user-1", afterReset);

    expect(vi.mocked(query).mock.calls[0][1]).toEqual(["user-1", "2026-10-30"]);
    expect(vi.mocked(query).mock.calls[1][1]).toEqual(["user-1", "2026-10-31"]);
  });
});
