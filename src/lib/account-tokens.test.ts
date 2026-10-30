import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
}));

import { hashAccountToken } from "./account-token-crypto";
import {
  createAccountToken,
  findAccountToken,
  setPasswordWithToken,
} from "./account-tokens";
import { query, withTransaction } from "./db";

const now = new Date("2026-10-30T12:00:00.000Z");
const clientQuery = vi.fn();

function mockTransaction(): void {
  vi.mocked(withTransaction).mockImplementation((async (
    callback: (client: { query: typeof clientQuery }) => unknown
  ) => callback({ query: clientQuery })) as never);
}

describe("findAccountToken", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockTransaction();
  });

  it("fails closed for used, expired, or wrong-purpose tokens", async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);

    await expect(
      findAccountToken("raw-token", "password_reset", now)
    ).resolves.toBeNull();

    const [sql, params] = vi.mocked(query).mock.calls[0];
    expect(sql).toContain("t.purpose = $2");
    expect(sql).toContain("t.used_at is null");
    expect(sql).toContain("t.expires_at > $3");
    expect(params).toEqual([hashAccountToken("raw-token"), "password_reset", now]);
  });

  it("returns the account for a valid unused token", async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [{ user_id: "user-1", email: "person@example.com" }],
    } as never);

    await expect(
      findAccountToken("raw-token", "account_invite", now)
    ).resolves.toEqual({
      userId: "user-1",
      email: "person@example.com",
    });
  });
});

describe("setPasswordWithToken", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockTransaction();
  });

  it("returns null without touching the user when the token cannot be consumed", async () => {
    clientQuery.mockResolvedValue({ rows: [] });

    await expect(
      setPasswordWithToken({
        rawToken: "raw-token",
        purpose: "password_reset",
        passwordHash: "new-hash",
        now,
      })
    ).resolves.toBeNull();

    expect(clientQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = clientQuery.mock.calls[0];
    expect(sql).toContain("set used_at = $3");
    expect(sql).toContain("t.used_at is null");
    expect(sql).toContain("t.expires_at > $3");
    expect(params).toEqual([
      hashAccountToken("raw-token"),
      "password_reset",
      now,
    ]);
  });

  it("consumes once, increments the session version, and clears must-change", async () => {
    clientQuery
      .mockResolvedValueOnce({
        rows: [{ user_id: "user-1", email: "person@example.com" }],
      })
      .mockResolvedValueOnce({ rows: [{ session_version: 2 }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      setPasswordWithToken({
        rawToken: "raw-token",
        purpose: "password_reset",
        passwordHash: "new-hash",
        now,
      })
    ).resolves.toEqual({
      userId: "user-1",
      email: "person@example.com",
    });

    const calls = clientQuery.mock.calls;
    expect(calls[0][0]).toContain("set used_at = $3");
    expect(calls[0][0]).toContain("returning u.id as user_id, u.email");

    const passwordUpdate = calls.find(([sql]) =>
      String(sql).includes("update public.users")
    );
    expect(passwordUpdate).toBeDefined();
    expect(passwordUpdate?.[0]).toContain(
      "session_version = session_version + 1"
    );
    expect(passwordUpdate?.[0]).toContain("must_change_password = false");
    expect(passwordUpdate?.[1]).toEqual(["user-1", "new-hash"]);

    const invalidation = calls.find(
      ([sql]) =>
        String(sql).includes("update public.account_tokens") &&
        !String(sql).includes("returning")
    );
    expect(invalidation?.[1]).toEqual(["user-1", "password_reset", now]);
  });

  it("does not update the password twice when a token is replayed", async () => {
    let consumed = false;
    clientQuery.mockImplementation((async (sql: string) => {
      if (
        sql.includes("update public.account_tokens t") &&
        sql.includes("returning")
      ) {
        if (consumed) return { rows: [] };
        consumed = true;
        return {
          rows: [{ user_id: "user-1", email: "person@example.com" }],
        };
      }
      return { rows: [] };
    }) as never);

    await expect(
      setPasswordWithToken({
        rawToken: "raw-token",
        purpose: "password_reset",
        passwordHash: "first-hash",
        now,
      })
    ).resolves.toEqual({
      userId: "user-1",
      email: "person@example.com",
    });

    await expect(
      setPasswordWithToken({
        rawToken: "raw-token",
        purpose: "password_reset",
        passwordHash: "second-hash",
        now,
      })
    ).resolves.toBeNull();

    const passwordUpdates = clientQuery.mock.calls.filter(([sql]) =>
      String(sql).includes("update public.users")
    );
    expect(passwordUpdates).toHaveLength(1);
    expect(passwordUpdates[0][1]).toEqual(["user-1", "first-hash"]);
  });
});

describe("createAccountToken", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockTransaction();
    clientQuery.mockResolvedValue({ rows: [] });
  });

  it("invalidates the previous unused token before inserting a hashed token", async () => {
    const created = await createAccountToken({
      userId: "user-1",
      purpose: "account_invite",
      createdBy: "admin-1",
      now,
    });

    const calls = clientQuery.mock.calls;
    expect(calls[0][0]).toContain("set used_at = $3");
    expect(calls[0][0]).toContain(
      "where user_id = $1 and purpose = $2 and used_at is null"
    );
    expect(calls[0][1]).toEqual(["user-1", "account_invite", now]);

    expect(calls[1][0]).toContain("insert into public.account_tokens");
    const params = calls[1][1] as unknown[];
    expect(params).toEqual([
      "user-1",
      "account_invite",
      hashAccountToken(created.rawToken),
      new Date("2026-10-31T12:00:00.000Z"),
      "admin-1",
      now,
    ]);
    expect(params[2]).not.toBe(created.rawToken);
    expect(created.expiresAt.toISOString()).toBe("2026-10-31T12:00:00.000Z");
  });
});
