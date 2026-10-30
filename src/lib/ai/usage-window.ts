export function usageDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function usageResetAt(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
}
