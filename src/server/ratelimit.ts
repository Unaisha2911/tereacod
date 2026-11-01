/**
 * TereaCOD — in-process sliding-window rate limiter.
 *
 * Local/preview: in-memory Map (per Worker isolate in production).
 * The plan's Durable Object token bucket replaces this on Workers when
 * precise cross-isolate limits are needed (see docs §8.3) — the call sites
 * do not change.
 */

const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((ts) => ts > windowStart);

  if (hits.length >= limit) {
    const oldest = hits[0];
    buckets.set(key, hits);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Opportunistic cleanup so the map cannot grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((ts) => ts <= windowStart)) buckets.delete(k);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
