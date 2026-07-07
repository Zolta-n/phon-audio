import "server-only";

// Minimal in-memory sliding-window rate limiter (local copy of
// web/lib/rateLimit.ts). Per-process only — fine for a one-admin tool.

const windows = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    windows.set(key, hits);
    return false;
  }
  hits.push(now);
  windows.set(key, hits);
  return true;
}
