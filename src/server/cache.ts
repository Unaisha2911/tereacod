/**
 * TereaCOD — hot-path data cache.
 *
 * THREE-tier read-through memo for read-only reference data (settings, nav,
 * categories, brands, faqs, legal, the published catalog):
 *
 *   L1  per-isolate memory Map — zero cost, dies with the isolate.
 *   L2  Workers Cache API (caches.default) — SHARED across every isolate
 *       in a colo, so a cold isolate pays one cache read (~1-2ms) instead
 *       of re-issuing ~8 D1/KV round trips (~400ms+). This is the single
 *       biggest cold-start TTFB lever on Workers without switching pages
 *       away from dynamic rendering (see the note in app/(site)/layout.tsx
 *       on why prerendering would bake the build machine's empty DB).
 *   L3  the repositories themselves (D1 / KV).
 *
 *   • within a request, identical reads collapse to one query;
 *   • within an isolate, hot data is memory-speed until the TTL elapses;
 *   • across isolates/colo restarts, L2 answers until the TTL elapses and
 *     serves stale-while-revalidate for a short grace window (a background
 *     refresh runs via waitUntil — never blocking the response).
 *
 * Staleness semantics are unchanged from the memory-only design: admin
 * edits surface within the same TTL on the writing colo (write paths
 * invalidate L1 AND delete the L2 entry), and other colos converge when
 * their TTL lapses (+grace, bounded, see L2_GRACE_S). Per-user data
 * (rbac:*) is deliberately L2-EXCLUDED — it stays memory-only.
 *
 * Everything is best-effort: Cache API absence (bun dev / Node standalone),
 * quota errors or serialization failures simply fall through to the
 * repository. On Workers each isolate owns its own L1 — memory cost is
 * bounded by the soft ceiling below.
 */

type Entry = { value: unknown; expiresAt: number };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/** Soft ceiling — drop expired entries first, then everything. */
const MAX_ENTRIES = 512;

/**
 * L2 envelope + keyspace version. Bump L2_VERSION whenever a cached value's
 * SHAPE changes so old edges never deserialize a mismatched payload.
 */
const L2_VERSION = "v1";
const L2_PREFIX = `terea-l2:${L2_VERSION}:`;
/** Stale-while-revalidate grace window (seconds) for L2 entries. */
const L2_GRACE_S = 15;
/** Never L2-cache values larger than this (JSON bytes) — keeps puts cheap. */
const L2_MAX_BYTES = 512 * 1024;
/** Key prefixes that must stay memory-only (per-user / privacy / churn). */
const L2_EXCLUDED_PREFIXES = ["rbac:", "cart:"];

/** Per-data-class TTLs. The trade-off everywhere is "admin edit latency"
 * vs "repeat-request cost": reference data that almost never changes gets
 * minutes, the catalog list gets seconds so a new product surfaces fast. */
export const CACHE_TTL = {
  /** Site settings document (KV settings:site). */
  settings: 60_000,
  /** Delivery fees/threshold (KV settings:delivery). */
  delivery: 60_000,
  /** Feature flags — flip rarely but matter operationally (maintenance). */
  flags: 10_000,
  /** Navigation locations — one combined read for all six shell lists. */
  nav: 60_000,
  /** Long-lived editorial text: legal bodies, FAQs, compliance records. */
  content: 300_000,
  /** Categories + brands + brand counts. */
  taxonomy: 60_000,
  /** Published catalog list / filtered listings. */
  catalogList: 10_000,
  /** Individual published product pages. */
  product: 60_000,
  /** Per-user role/permission set — resolved on every authenticated request. */
  rbac: 30_000,
} as const;

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): T {
  if (store.size > MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of store) {
      if (v.expiresAt <= now) store.delete(k);
    }
    if (store.size > MAX_ENTRIES) store.clear();
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

// ---------------------------------------------------------------------------
// L2 — Workers Cache API. Isolated in small guarded helpers so the rest of
// the cache logic reads as if the tier does not exist.
// ---------------------------------------------------------------------------

interface L2Envelope {
  v: 1;
  /** Absolute epoch ms when the VALUE goes stale (the L1 TTL). */
  expiresAt: number;
  value: unknown;
}

type CloudflareCache = {
  match: (request: RequestInfo) => Promise<Response | undefined>;
  put: (request: RequestInfo, response: Response) => Promise<void>;
  delete: (request: RequestInfo) => Promise<boolean>;
};

/**
 * The colo-wide cache, or null outside Workers / when unavailable.
 * Cast through unknown: the TS DOM lib's CacheStorage lacks the Workers
 * `default` cache, and `caches` simply does not exist under Node/bun dev.
 */
function l2Cache(): CloudflareCache | null {
  try {
    const caches = (globalThis as unknown as { caches?: { default?: CloudflareCache } }).caches;
    return caches?.default ?? null;
  } catch {
    return null;
  }
}

/** True when the key is safe to share colo-wide. */
function l2Eligible(key: string): boolean {
  return !L2_EXCLUDED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function l2Url(key: string): string {
  // Synthetic absolute URL — the Cache API keys on full URLs; the hostname
  // is never fetched, it only namespaces the entries away from real traffic.
  return `https://l2-cache.tereacod.internal/${L2_PREFIX}${encodeURIComponent(key)}`;
}

/** Run `fn` in the background where the platform allows (Workers waitUntil). */
function runInBackground(fn: () => Promise<void>): void {
  void (async () => {
    try {
      // Dynamic import — same pattern as src/server/jobs.ts; the module is
      // only present in the OpenNext Workers bundle.
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      getCloudflareContext().ctx.waitUntil(fn());
    } catch {
      // No execution context (dev / unexpected runtime) — best-effort floating
      // promise. Workers may cut it short; the next request repopulates anyway.
      await fn().catch(() => undefined);
    }
  })();
}

async function l2Get(key: string): Promise<{ value: unknown; fresh: boolean } | null> {
  const cache = l2Cache();
  if (!cache) return null;
  try {
    const response = await cache.match(l2Url(key));
    if (!response) return null;
    const envelope = (await response.json()) as L2Envelope;
    if (!envelope || envelope.v !== 1) return null;
    return { value: envelope.value, fresh: envelope.expiresAt > Date.now() };
  } catch {
    return null; // corrupt entry / parse failure → treat as a miss
  }
}

async function l2Put(key: string, value: unknown, ttlMs: number): Promise<void> {
  const cache = l2Cache();
  if (!cache || !l2Eligible(key)) return;
  try {
    const body = JSON.stringify({ v: 1, expiresAt: Date.now() + ttlMs, value } satisfies L2Envelope);
    if (body.length > L2_MAX_BYTES) return;
    // Store for ttl + grace so a stale entry survives long enough to be
    // served (and refreshed) inside the SWR window instead of evicting.
    const maxAgeS = Math.ceil(ttlMs / 1000) + L2_GRACE_S;
    const response = new Response(body, {
      headers: { "content-type": "application/json", "cache-control": `public, max-age=${maxAgeS}` },
    });
    await cache.put(l2Url(key), response);
  } catch {
    // Quota / serialization failures are non-fatal — L1 + L3 still work.
  }
}

async function l2Delete(key: string): Promise<void> {
  const cache = l2Cache();
  if (!cache) return;
  try {
    await cache.delete(l2Url(key));
  } catch {
    // Best-effort — the TTL bounds staleness regardless.
  }
}

// ---------------------------------------------------------------------------
// Read-through core
// ---------------------------------------------------------------------------

/**
 * Read-through helper: L1 memory → L2 colo cache → `loader`. Concurrent
 * callers awaiting the same key share one loader promise (per-isolate
 * dogpile protection).
 *
 * L2 freshness rules:
 *   fresh hit  → hydrate L1, return immediately (no D1/KV traffic);
 *   stale hit  → return the stale value AND refresh in the background
 *                (waitUntil) — the response never waits on the refresh;
 *                when no waitUntil exists the loader runs inline instead,
 *                trading the grace win for guaranteed freshness.
 */
export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;

  const l2 = await l2Get(key);
  if (l2 && l2Eligible(key)) {
    if (l2.fresh) {
      cacheSet(key, l2.value as T, ttlMs);
      return l2.value as T;
    }
    // Stale-but-present: serve it now, refresh behind the response.
    cacheSet(key, l2.value as T, Math.min(ttlMs, 2_000));
    runInBackground(async () => {
      const value = await loader();
      cacheSet(key, value, ttlMs);
      await l2Put(key, value, ttlMs);
    });
    return l2.value as T;
  }

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const promise = loader()
    .then(async (value) => {
      cacheSet(key, value, ttlMs);
      // Await the L2 write (a colo-local ~1-10ms put): a cold isolate's very
      // next request must find the entry, not pay the loader again.
      await l2Put(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

/**
 * Drop every cached key starting with the prefix (e.g. "catalog:",
 * "settings:"). Prefix-based so one admin save can flush a family of keys.
 *
 * L1 is cleared synchronously (the writing isolate sees the edit on its
 * next read). L2 deletions are fire-and-forget per key — the writing colo's
 * cache entry disappears within milliseconds; other colos converge when
 * their TTL + grace lapses, exactly like the memory-only design.
 */
export function invalidateCache(prefix: string): void {
  const l2Keys: string[] = [];
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      inflight.delete(key);
      if (l2Eligible(key)) l2Keys.push(key);
    }
  }
  if (l2Keys.length > 0) {
    runInBackground(async () => {
      for (const key of l2Keys) await l2Delete(key);
    });
  }
}

/** Test/seed helper — forget everything. */
export function cacheClear(): void {
  store.clear();
  inflight.clear();
}
