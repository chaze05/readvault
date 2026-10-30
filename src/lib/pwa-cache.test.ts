import { readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { clearClientSessionData } from "./client-session-cleanup";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("service worker cache policy", () => {
  it("never intercepts API requests", async () => {
    const source = await readFile(
      path.join(process.cwd(), "public", "sw.js"),
      "utf8"
    );

    expect(source).toMatch(
      /if \(url\.pathname\.startsWith\("\/api\/"\)\) return;/
    );
    expect(source).not.toContain("networkFirst(request, RUNTIME_CACHE");
    expect(source).not.toContain("staleWhileRevalidate");
  });

  it("precaches only public shell assets", async () => {
    const source = await readFile(
      path.join(process.cwd(), "public", "sw.js"),
      "utf8"
    );
    const precache = /const PRECACHE = \[([\s\S]*?)\];/.exec(source)?.[1] ?? "";

    expect(precache).toContain('"/"');
    expect(precache).toContain('OFFLINE_URL');
    expect(precache).toContain('"/manifest.webmanifest"');
    expect(precache).not.toContain('"/library"');
    expect(precache).not.toContain('"/recent"');
  });

  it("bumps cache names and removes old ReadVault caches on activation", async () => {
    const source = await readFile(
      path.join(process.cwd(), "public", "sw.js"),
      "utf8"
    );

    expect(source).toContain('const SHELL_CACHE = "readvault-shell-v3"');
    expect(source).toContain('const RUNTIME_CACHE = "readvault-runtime-v4"');
    expect(source).toContain('const PDF_CACHE = "readvault-pdfs-v2"');
    expect(source).toContain("!CURRENT_CACHES.has(key)");
    expect(source).toContain("caches.delete(key)");
  });
});

describe("clearClientSessionData", () => {
  it("deletes every ReadVault cache and clears the motion cookie", async () => {
    const deleteCache = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", {
      keys: vi
        .fn()
        .mockResolvedValue([
          "readvault-shell-v3",
          "readvault-runtime-v4",
          "readvault-pdfs-v2",
          "other-cache",
        ]),
      delete: deleteCache,
    });
    const documentStub = { cookie: "" };
    vi.stubGlobal("document", documentStub);

    await clearClientSessionData();

    expect(deleteCache).toHaveBeenCalledTimes(3);
    expect(deleteCache).toHaveBeenCalledWith("readvault-shell-v3");
    expect(deleteCache).toHaveBeenCalledWith("readvault-runtime-v4");
    expect(deleteCache).toHaveBeenCalledWith("readvault-pdfs-v2");
    expect(deleteCache).not.toHaveBeenCalledWith("other-cache");
    expect(documentStub.cookie).toBe(
      "readvault-motion=; Max-Age=0; Path=/; SameSite=Lax"
    );
  });

  it("is safe when CacheStorage is unavailable", async () => {
    vi.stubGlobal("caches", undefined);
    vi.stubGlobal("document", undefined);

    await expect(clearClientSessionData()).resolves.toBeUndefined();
  });
});
