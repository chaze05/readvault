import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/current-user", () => ({
  requireActiveUser: vi.fn(),
}));

vi.mock("@/lib/bookmark-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bookmark-store")>();
  return {
    ...actual,
    setFavorite: vi.fn(),
  };
});

import { NextRequest } from "next/server";

import { setFavorite } from "@/lib/bookmark-store";
import { requireActiveUser } from "@/lib/current-user";

import { PATCH } from "./route";

const bookId = "11111111-1111-4111-8111-111111111111";
const storyId = "22222222-2222-4222-8222-222222222222";

const user = {
  id: "db-user-1",
  email: "user@example.com",
  isAdmin: false,
  mustChangePassword: false,
  sessionVersion: 0,
};

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/favorites", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function expectNoStore(response: Response) {
  expect(response.headers.get("cache-control")).toBe(
    "private, no-store, max-age=0, must-revalidate"
  );
  expect(response.headers.get("vary")).toBe("Cookie");
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(requireActiveUser).mockResolvedValue(user);
  vi.mocked(setFavorite).mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PATCH /api/favorites", () => {
  it("returns 401 without an active user", async () => {
    vi.mocked(requireActiveUser).mockResolvedValue(null);

    const response = await PATCH(
      request({ kind: "book", id: bookId, isFavorite: true })
    );

    expect(response.status).toBe(401);
    expectNoStore(response);
    expect(setFavorite).not.toHaveBeenCalled();
  });

  it.each([
    { label: "malformed JSON", body: "{" },
    { label: "invalid kind", body: { kind: "video", id: bookId, isFavorite: true } },
    { label: "invalid uuid", body: { kind: "book", id: "not-a-uuid", isFavorite: true } },
    { label: "missing isFavorite", body: { kind: "book", id: bookId } },
  ])("rejects $label with 400", async ({ body }) => {
    const response = await PATCH(request(body));

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(setFavorite).not.toHaveBeenCalled();
  });

  it.each([
    { kind: "book" as const, id: bookId },
    { kind: "story" as const, id: storyId },
  ])("toggles a $kind favorite and returns the result", async ({ kind, id }) => {
    const response = await PATCH(
      request({ kind, id, isFavorite: true })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ kind, id, isFavorite: true });
    expectNoStore(response);
    expect(setFavorite).toHaveBeenCalledWith(user.id, kind, id, true);
  });

  it.each([
    { kind: "book" as const, message: "Book not found." },
    { kind: "story" as const, message: "Story not found." },
  ])("returns 404 when the $kind is missing or foreign", async ({ kind, message }) => {
    vi.mocked(setFavorite).mockResolvedValue(false);

    const response = await PATCH(
      request({
        kind,
        id: kind === "book" ? bookId : storyId,
        isFavorite: false,
      })
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: message });
    expectNoStore(response);
  });

  it("returns a safe 500 envelope for unexpected store failures", async () => {
    vi.mocked(setFavorite).mockRejectedValue(new Error("database down"));

    const response = await PATCH(
      request({ kind: "book", id: bookId, isFavorite: true })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Unable to update this favorite.",
    });
    expectNoStore(response);
    expect(console.error).toHaveBeenCalledWith(
      "[favorites] update failed:",
      "database down"
    );
  });
});
