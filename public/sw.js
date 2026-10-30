const SHELL_CACHE = "readvault-shell-v3";
const RUNTIME_CACHE = "readvault-runtime-v4";
const PDF_CACHE = "readvault-pdfs-v2";
const CURRENT_CACHES = new Set([SHELL_CACHE, RUNTIME_CACHE, PDF_CACHE]);
const OFFLINE_URL = "/offline";
const TOKEN_PATHS = ["/reset-password", "/accept-invite"];

const PRECACHE = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/pdf.worker.min.mjs",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        Promise.allSettled(PRECACHE.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("readvault-") && !CURRENT_CACHES.has(key)
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API responses can contain per-user data. Never intercept or cache them.
  if (url.pathname.startsWith("/api/")) return;

  // Reset and invite links must always hit the network.
  if (
    TOKEN_PATHS.some(
      (path) => url.pathname === path || url.pathname.startsWith(`${path}/`)
    )
  ) {
    return;
  }

  if (request.mode === "navigate") {
    if (url.pathname === "/" || url.pathname === OFFLINE_URL) {
      event.respondWith(networkFirst(request, SHELL_CACHE, OFFLINE_URL));
      return;
    }

    // Authenticated navigations are network-only. Offline navigations fall
    // back to the public offline page rather than a previous user's HTML.
    event.respondWith(networkOnlyWithOfflineFallback(request, OFFLINE_URL));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/pdf.worker.min.mjs"
  ) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    const offline = await offlineFallback(fallbackUrl);
    if (offline) return offline;

    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function networkOnlyWithOfflineFallback(request, fallbackUrl) {
  try {
    return await fetch(request);
  } catch {
    const offline = await offlineFallback(fallbackUrl);
    if (offline) return offline;

    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function offlineFallback(fallbackUrl) {
  const shell = await caches.open(SHELL_CACHE);
  return shell.match(fallbackUrl);
}
