import "server-only";

// Minimal in-memory sliding-window rate limiter. Per-process only — good
// enough for a single-instance MVP; swap for Upstash/Redis when scaling out.

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
