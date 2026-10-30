import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./session-cookies", () => ({
  getSession: vi.fn(),
}));

vi.mock("./users", () => ({
  findUserById: vi.fn(),
}));

import {
  getCurrentUser,
  requireActiveUser,
  requireAdmin,
} from "./current-user";
import { getSession } from "./session-cookies";
import { findUserById } from "./users";

const session = {
  userId: "user-1",
  email: "token@example.com",
  sessionVersion: 3,
  mustChangePassword: false,
};

const userRow = {
  id: "user-1",
  email: "db@example.com",
  is_admin: false,
  session_version: 3,
  must_change_password: false,
};

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSession).mockResolvedValue(session);
    vi.mocked(findUserById).mockResolvedValue(userRow);
  });

  it("returns null without a database lookup when the session is missing", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(findUserById).not.toHaveBeenCalled();
  });

  it("rejects a missing database user", async () => {
    vi.mocked(findUserById).mockResolvedValue(null);

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("rejects a session whose version does not match the database", async () => {
    vi.mocked(findUserById).mockResolvedValue({
      ...userRow,
      session_version: 4,
    });

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("uses database email, admin flag, and must-change state", async () => {
    vi.mocked(findUserById).mockResolvedValue({
      ...userRow,
      is_admin: true,
      must_change_password: true,
    });

    await expect(getCurrentUser()).resolves.toEqual({
      id: "user-1",
      email: "db@example.com",
      isAdmin: true,
      mustChangePassword: true,
      sessionVersion: 3,
    });
  });
});

describe("requireActiveUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSession).mockResolvedValue(session);
    vi.mocked(findUserById).mockResolvedValue(userRow);
  });

  it("blocks a user whose database flag requires a password change", async () => {
    vi.mocked(findUserById).mockResolvedValue({
      ...userRow,
      must_change_password: true,
    });

    await expect(requireActiveUser()).resolves.toBeNull();
  });

  it("allows an active user even when the token's stale flag was true", async () => {
    vi.mocked(getSession).mockResolvedValue({
      ...session,
      mustChangePassword: true,
    });

    await expect(requireActiveUser()).resolves.toMatchObject({
      id: "user-1",
      mustChangePassword: false,
    });
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSession).mockResolvedValue(session);
    vi.mocked(findUserById).mockResolvedValue(userRow);
  });

  it("blocks an active non-admin", async () => {
    await expect(requireAdmin()).resolves.toBeNull();
  });

  it("uses the database admin flag as the authority", async () => {
    vi.mocked(findUserById).mockResolvedValue({
      ...userRow,
      is_admin: true,
    });

    await expect(requireAdmin()).resolves.toMatchObject({
      id: "user-1",
      isAdmin: true,
    });
  });

  it("blocks an admin who must change their password", async () => {
    vi.mocked(findUserById).mockResolvedValue({
      ...userRow,
      is_admin: true,
      must_change_password: true,
    });

    await expect(requireAdmin()).resolves.toBeNull();
  });
});
