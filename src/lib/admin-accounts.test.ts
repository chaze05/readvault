import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

vi.mock("@/lib/account-tokens", () => ({
  createAccountToken: vi.fn(),
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn(),
}));

vi.mock("@/lib/app-url", () => ({
  buildAccountTokenUrl: vi.fn(),
}));

import { createAccountToken } from "@/lib/account-tokens";
import { buildAccountTokenUrl } from "@/lib/app-url";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/password";

import {
  AdminAccountError,
  createFamilyAccount,
  createPasswordResetLink,
  listFamilyAccounts,
} from "./admin-accounts";

const createdAt = new Date("2026-10-30T12:00:00.000Z");
const inviteExpiry = new Date("2026-10-31T12:00:00.000Z");
const resetExpiry = new Date("2026-10-30T13:00:00.000Z");
const userRow = {
  id: "user-1",
  email: "family@example.com",
  created_at: createdAt,
  is_admin: false,
};
const account = {
  id: "user-1",
  email: "family@example.com",
  createdAt,
  isAdmin: false,
};

function queryResult(rows: unknown[]): never {
  return { rows } as never;
}

describe("listFamilyAccounts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns safe account fields ordered by creation", async () => {
    vi.mocked(query).mockResolvedValue(queryResult([userRow]));

    const accounts = await listFamilyAccounts();

    expect(accounts).toEqual([account]);
    const [sql] = vi.mocked(query).mock.calls[0];
    expect(sql).toContain("from public.users");
    expect(sql).toContain("order by created_at");
    expect(sql).not.toContain("password_hash");
  });
});

describe("createFamilyAccount", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(query).mockResolvedValue(queryResult([userRow]));
    vi.mocked(hashPassword).mockResolvedValue("bcrypt-hash");
    vi.mocked(createAccountToken).mockResolvedValue({
      rawToken: "raw-invite-token",
      expiresAt: inviteExpiry,
    });
    vi.mocked(buildAccountTokenUrl).mockReturnValue(
      "http://localhost:3000/accept-invite?token=raw-invite-token"
    );
  });

  it("creates invite accounts with a forced password change and a 24-hour invite URL", async () => {
    const result = await createFamilyAccount({
      email: "family@example.com",
      method: "invite",
      createdBy: "admin-1",
    });

    expect(result).toEqual({
      method: "invite",
      account,
      inviteUrl:
        "http://localhost:3000/accept-invite?token=raw-invite-token",
      expiresAt: inviteExpiry,
    });
    expect(JSON.stringify(result)).not.toContain("bcrypt-hash");

    const [insertSql, insertParams] = vi.mocked(query).mock.calls[0];
    expect(insertSql).toContain("must_change_password");
    expect(insertParams).toEqual(["family@example.com", "bcrypt-hash"]);

    const generatedPassword = vi.mocked(hashPassword).mock.calls[0][0];
    expect(generatedPassword.length).toBeGreaterThanOrEqual(16);
    expect(createAccountToken).toHaveBeenCalledWith({
      userId: "user-1",
      purpose: "account_invite",
      createdBy: "admin-1",
    });
    expect(buildAccountTokenUrl).toHaveBeenCalledWith(
      "raw-invite-token",
      "account_invite"
    );
  });

  it("returns a temporary password once and never creates an invite token", async () => {
    const result = await createFamilyAccount({
      email: "family@example.com",
      method: "temporary_password",
      createdBy: "admin-1",
    });

    expect(result.method).toBe("temporary_password");
    if (result.method !== "temporary_password") {
      throw new Error("Expected a temporary password result.");
    }

    const generatedPassword = vi.mocked(hashPassword).mock.calls[0][0];
    expect(result.temporaryPassword).toBe(generatedPassword);
    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(16);
    expect(result.account).toEqual(account);
    expect(createAccountToken).not.toHaveBeenCalled();
    expect(buildAccountTokenUrl).not.toHaveBeenCalled();
  });

  it("removes the new account when invitation token creation fails", async () => {
    vi.mocked(createAccountToken).mockRejectedValue(
      new Error("token insert failed")
    );

    await expect(
      createFamilyAccount({
        email: "family@example.com",
        method: "invite",
        createdBy: "admin-1",
      })
    ).rejects.toThrow("token insert failed");

    expect(vi.mocked(query)).toHaveBeenCalledTimes(2);
    const [deleteSql, deleteParams] = vi.mocked(query).mock.calls[1];
    expect(deleteSql).toContain("delete from public.users");
    expect(deleteParams).toEqual(["user-1"]);
  });

  it("rejects duplicate emails without creating a token", async () => {
    vi.mocked(query).mockRejectedValue(
      Object.assign(new Error("duplicate key"), { code: "23505" })
    );

    await expect(
      createFamilyAccount({
        email: "family@example.com",
        method: "invite",
        createdBy: "admin-1",
      })
    ).rejects.toMatchObject({
      name: "AdminAccountError",
      code: "duplicate_email",
    });
    await expect(
      createFamilyAccount({
        email: "family@example.com",
        method: "invite",
        createdBy: "admin-1",
      })
    ).rejects.toBeInstanceOf(AdminAccountError);
    expect(createAccountToken).not.toHaveBeenCalled();
  });
});

describe("createPasswordResetLink", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(query).mockResolvedValue(
      queryResult([{ id: "user-1", email: "family@example.com" }])
    );
    vi.mocked(createAccountToken).mockResolvedValue({
      rawToken: "raw-reset-token",
      expiresAt: resetExpiry,
    });
    vi.mocked(buildAccountTokenUrl).mockReturnValue(
      "http://localhost:3000/reset-password?token=raw-reset-token"
    );
  });

  it("creates a one-hour reset link for the matching account", async () => {
    const result = await createPasswordResetLink(
      "family@example.com",
      "admin-1"
    );

    expect(result).toEqual({
      email: "family@example.com",
      resetUrl: "http://localhost:3000/reset-password?token=raw-reset-token",
      expiresAt: resetExpiry,
    });
    expect(createAccountToken).toHaveBeenCalledWith({
      userId: "user-1",
      purpose: "password_reset",
      createdBy: "admin-1",
    });
    expect(buildAccountTokenUrl).toHaveBeenCalledWith(
      "raw-reset-token",
      "password_reset"
    );
  });

  it("throws a not-found error when the account does not exist", async () => {
    vi.mocked(query).mockResolvedValue(queryResult([]));

    await expect(
      createPasswordResetLink("missing@example.com", "admin-1")
    ).rejects.toMatchObject({
      name: "AdminAccountError",
      code: "account_not_found",
    });
    expect(createAccountToken).not.toHaveBeenCalled();
  });
});
