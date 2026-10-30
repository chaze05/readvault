const CACHE_PREFIX = "readvault-";
const MOTION_COOKIE = "readvault-motion";

export async function clearReadVaultCaches(): Promise<void> {
  if (typeof caches === "undefined") return;

  try {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX))
        .map((key) => caches.delete(key))
    );
  } catch {
    // Sign-out still succeeds if CacheStorage is unavailable.
  }
}

export function clearMotionCookie(): void {
  if (typeof document === "undefined") return;

  document.cookie = `${MOTION_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export async function clearClientSessionData(): Promise<void> {
  clearMotionCookie();
  await clearReadVaultCaches();
}
