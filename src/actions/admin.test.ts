import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/current-user", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/admin-accounts", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/admin-accounts")>();
  return {
    ...actual,
    createFamilyAccount: vi.fn(),
    createPasswordResetLink: vi.fn(),
  };
});

import { revalidatePath } from "next/cache";

import {
  AdminAccountError,
  createFamilyAccount,
  createPasswordResetLink,
} from "@/lib/admin-accounts";
import { requireAdmin } from "@/lib/current-user";

import {
  createFamilyAccountAction,
  generateResetLinkAction,
} from "./admin";

const ADMIN_REQUIRED_ERROR =
  "Only administrators can manage family accounts.";
const admin = {
  id: "admin-1",
  email: "owner@example.com",
  isAdmin: true,
  mustChangePassword: false,
  sessionVersion: 0,
};
const createdAt = new Date("2026-10-30T12:00:00.000Z");
const account = {
  id: "user-1",
  email: "family@example.com",
  createdAt,
  isAdmin: false,
};

function buildFormData(values: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("createFamilyAccountAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(admin);
  });

  it("rejects callers without admin access before doing any work", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);

    const result = await createFamilyAccountAction(
      buildFormData({
        email: "family@example.com",
        method: "invite",
      })
    );

    expect(result).toEqual({ error: ADMIN_REQUIRED_ERROR });
    expect(createFamilyAccount).not.toHaveBeenCalled();
  });

  it("rejects invalid input without creating an account", async () => {
    const result = await createFamilyAccountAction(
      buildFormData({ email: "not-an-email", method: "invite" })
    );

    expect(result).toEqual({ error: "Enter a valid email address." });
    expect(createFamilyAccount).not.toHaveBeenCalled();
  });

  it("normalizes the email and creates an invite account", async () => {
    vi.mocked(createFamilyAccount).mockResolvedValue({
      method: "invite",
      account,
      inviteUrl:
        "http://localhost:3000/accept-invite?token=raw-invite-token",
      expiresAt: new Date("2026-10-31T12:00:00.000Z"),
    });

    const result = await createFamilyAccountAction(
      buildFormData({
        email: " Family@Example.com ",
        method: "invite",
      })
    );

    expect(createFamilyAccount).toHaveBeenCalledWith({
      email: "family@example.com",
      method: "invite",
      createdBy: "admin-1",
    });
    expect(result).toEqual({
      ok: true,
      method: "invite",
      email: "family@example.com",
      inviteUrl:
        "http://localhost:3000/accept-invite?token=raw-invite-token",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("returns the temporary password once for temporary accounts", async () => {
    vi.mocked(createFamilyAccount).mockResolvedValue({
      method: "temporary_password",
      account,
      temporaryPassword: "generated-temporary-password",
    });

    const result = await createFamilyAccountAction(
      buildFormData({
        email: "family@example.com",
        method: "temporary_password",
      })
    );

    expect(result).toEqual({
      ok: true,
      method: "temporary_password",
      email: "family@example.com",
      temporaryPassword: "generated-temporary-password",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("still returns the temporary password when revalidation fails", async () => {
    vi.mocked(createFamilyAccount).mockResolvedValue({
      method: "temporary_password",
      account,
      temporaryPassword: "generated-temporary-password",
    });
    vi.mocked(revalidatePath).mockImplementation(() => {
      throw new Error("revalidation failed");
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createFamilyAccountAction(
      buildFormData({
        email: "family@example.com",
        method: "temporary_password",
      })
    );

    expect(result).toEqual({
      ok: true,
      method: "temporary_password",
      email: "family@example.com",
      temporaryPassword: "generated-temporary-password",
    });
    consoleError.mockRestore();
  });

  it("reports duplicate emails as a user-facing error", async () => {
    vi.mocked(createFamilyAccount).mockRejectedValue(
      new AdminAccountError(
        "duplicate_email",
        "An account with that email already exists."
      )
    );

    const result = await createFamilyAccountAction(
      buildFormData({
        email: "family@example.com",
        method: "invite",
      })
    );

    expect(result).toEqual({
      error: "An account with that email already exists.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a generic error without exposing unexpected failures", async () => {
    vi.mocked(createFamilyAccount).mockRejectedValue(
      new Error("database details")
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createFamilyAccountAction(
      buildFormData({
        email: "family@example.com",
        method: "invite",
      })
    );

    expect(result).toEqual({
      error: "Could not create the account. Please try again.",
    });
    consoleError.mockRestore();
  });
});

describe("generateResetLinkAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(admin);
  });

  it("rejects callers without admin access before doing any work", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);

    const result = await generateResetLinkAction(
      buildFormData({ email: "family@example.com" })
    );

    expect(result).toEqual({ error: ADMIN_REQUIRED_ERROR });
    expect(createPasswordResetLink).not.toHaveBeenCalled();
  });

  it("rejects invalid emails without creating a token", async () => {
    const result = await generateResetLinkAction(
      buildFormData({ email: "not-an-email" })
    );

    expect(result).toEqual({ error: "Enter a valid email address." });
    expect(createPasswordResetLink).not.toHaveBeenCalled();
  });

  it("returns a one-hour reset link for the account", async () => {
    vi.mocked(createPasswordResetLink).mockResolvedValue({
      email: "family@example.com",
      resetUrl:
        "http://localhost:3000/reset-password?token=raw-reset-token",
      expiresAt: new Date("2026-10-30T13:00:00.000Z"),
    });

    const result = await generateResetLinkAction(
      buildFormData({ email: " Family@Example.com " })
    );

    expect(createPasswordResetLink).toHaveBeenCalledWith(
      "family@example.com",
      "admin-1"
    );
    expect(result).toEqual({
      ok: true,
      email: "family@example.com",
      resetUrl:
        "http://localhost:3000/reset-password?token=raw-reset-token",
    });
  });

  it("reports a missing account without leaking internal errors", async () => {
    vi.mocked(createPasswordResetLink).mockRejectedValue(
      new AdminAccountError(
        "account_not_found",
        "No account found with that email address."
      )
    );

    const result = await generateResetLinkAction(
      buildFormData({ email: "missing@example.com" })
    );

    expect(result).toEqual({
      error: "No account found with that email address.",
    });
  });

  it("returns a generic error for unexpected failures", async () => {
    vi.mocked(createPasswordResetLink).mockRejectedValue(
      new Error("database details")
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await generateResetLinkAction(
      buildFormData({ email: "family@example.com" })
    );

    expect(result).toEqual({
      error: "Could not create a reset link. Please try again.",
    });
    consoleError.mockRestore();
  });
});
