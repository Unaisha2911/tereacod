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

type Entry = { value: unknown; expiresAt: number; size: number };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
/** Background stale-while-revalidate refreshes — one per key per isolate. */
const refreshing = new Map<string, Promise<void>>();

/** Soft ceilings. Entries beyond these are evicted least-recently-used first.
 *
 * WHY A BYTE BUDGET: on Workers an isolate holds ~128 MB and exceeding it
 * surfaces as error 1102 ("Worker exceeded resource limits"). The old
 * design bounded only the entry COUNT (512) with no size accounting —
 * catalog-list entries can each reach hundreds of KB of hydrated JSON, so
 * a busy isolate could hold far more memory than 512 small entries
 * suggest, blow the limit, and die mid-request (every cached read then
 * misses at once, which also multiplies D1/KV subrequests). Budgeted LRU
 * eviction keeps the hot set resident while guaranteeing a hard ceiling.
 */
const MAX_ENTRIES = 512;
/** Approximate total value bytes kept in L1 (rough shallow estimate). */
const MAX_TOTAL_BYTES = 24 * 1024 * 1024;
/** Values estimated above this are never L1-cached at all (L2 still may). */
const MAX_ENTRY_BYTES = 2 * 1024 * 1024;
/**
 * How long an EXPIRED entry is retained purely as an emergency fallback.
 * It is never served as fresh — only when the live loader FAILS (transient
 * D1/KV outage), where "last known good content" beats a 500 page.
 */
const EXPIRED_RETENTION_MS = 15 * 60_000;

/**
 * Cheap SHALLOW size estimate (called on every set): strings measure
 * directly at ANY depth — they dominate real memory (a product description
 * is one string), and the former depth-2 cutoff counted every nested string
 * as 64 bytes, so hydrated catalog values estimated ~50× under their true
 * footprint. The L1/L2 ceilings then admitted values that actually blew the
 * isolate's ~128 MB budget — the error-1102 failure mode this budget exists
 * to prevent. Container recursion stays bounded (depth cap + sampled
 * children) so the estimate cost stays negligible.
 */
function estimateSize(value: unknown, depth = 0): number {
  if (value === null || value === undefined) return 8;
  const type = typeof value;
  if (type === "string") return 2 * (value as string).length + 16;
  if (type === "number" || type === "boolean" || type === "bigint") return 16;
  if (depth >= 8) return 256; // stop recursing — bounded estimate
  if (Array.isArray(value)) {
    let size = 40;
    const sample = value.length > 64 ? 64 : value.length;
    for (let i = 0; i < sample; i++) size += estimateSize(value[i], depth + 1);
    if (value.length > 64) size += Math.ceil((value.length - 64) * (size / 64));
    return size;
  }
  if (type === "object") {
    let size = 64;
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    const sample = keys.length > 32 ? keys.slice(0, 32) : keys;
    for (const key of sample) size += 2 * key.length + estimateSize(record[key], depth + 1);
    if (keys.length > 32) size += Math.ceil((keys.length - 32) * (size / 32));
    return size;
  }
  return 64; // functions / symbols — tiny, and never cached values anyway
}

/**
 * LRU upkeep on set: drop expired entries first; while over budget,
 * evict the LEAST-RECENTLY-USED entries (Map iteration order is insertion
 * order and cacheGet re-inserts on hit, so iteration starts at the coldest
 * end). Evicting a few hot-set survivors beats the old clear-everything,
 * which stampeded every reader back into D1/KV at once.
 */
function evict(): void {
  const now = Date.now();
  let totalBytes = 0;
  for (const entry of store.values()) totalBytes += entry.size;
  const overEntries = store.size > MAX_ENTRIES;
  const overBytes = totalBytes > MAX_TOTAL_BYTES;
  if (!overEntries && !overBytes) return;

  // Drop expired entries whose emergency-retention window has also lapsed
  // (recently expired ones stay as stale-on-error fallbacks).
  for (const [key, entry] of store) {
    if (entry.expiresAt + EXPIRED_RETENTION_MS <= now) store.delete(key);
  }
  totalBytes = 0;
  for (const entry of store.values()) totalBytes += entry.size;
  while (
    store.size > 0 &&
    (store.size > MAX_ENTRIES || totalBytes > MAX_TOTAL_BYTES)
  ) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    const entry = store.get(oldest.value);
    totalBytes -= entry?.size ?? 0;
    store.delete(oldest.value);
  }
}

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
    // Keep recently-expired entries in place as stale-on-error fallbacks
    // (see cached() below); evict() reaps them after the retention window.
    return undefined;
  }
  // Re-insert to mark the entry most-recently-used (Map order = LRU order).
  store.delete(key);
  store.set(key, entry);
  return entry.value as T;
}

/** The expired-but-retained fallback value for `key`, if one exists. */
function staleFallback<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry || entry.expiresAt > Date.now()) return undefined;
  if (entry.expiresAt + EXPIRED_RETENTION_MS <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): T {
  const size = estimateSize(value);
  // Oversized values would dominate the byte budget — keep them out of L1
  // entirely (they still flow through L2 when <= L2_MAX_BYTES).
  if (size > MAX_ENTRY_BYTES) {
    store.delete(key);
    return value;
  }
  evict();
  store.set(key, { value, expiresAt: Date.now() + ttlMs, size });
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
  // Cache API keys on full URLs. The host MUST be the deployed site's own
  // zone: Workers Cache API rejects (or silently drops) puts for URLs
  // outside the serving zone, which would strand every L2 write and push
  // ALL cold isolates straight into D1/KV on every request — the observed
  // production failure pattern. NEXT_PUBLIC_SITE_URL is the canonical
  // origin (wrangler.toml); a synthetic .internal host is only a dev
  // fallback where no real zone exists anyway.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const base = siteUrl
    ? `${siteUrl.replace(/\/+$/, "")}/__l2-cache/`
    : `https://l2-cache.tereacod.internal/${L2_PREFIX}`;
  return `${base}${L2_PREFIX}${encodeURIComponent(key)}`;
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
 * Last-resort degradation for a failed loader: serve the recently-expired
 * value (if any) for a few seconds instead of aborting the render. A
 * visitor seeing content a few seconds staler than usual is strictly
 * better than "Something went wrong" — the exact production symptom this
 * guards (intermittent 500s on tereacod.ae during transient D1/KV blips).
 */
async function serveStaleOnError<T>(key: string, ttlMs: number, error: unknown): Promise<T> {
  const stale = staleFallback<T>(key);
  if (stale === undefined) {
    throw error;
  }
  console.error(
    `[cache] loader failed for "${key}" — serving stale fallback (next retry in ${Math.min(ttlMs, 5_000)}ms):`,
    error instanceof Error ? error.message : error
  );
  cacheSet(key, stale, Math.min(ttlMs, 5_000));
  return stale;
}

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
 *
 * Failure rule (production hardening): when the loader rejects and a
 * recently-expired L1 value exists, that value is served for a few
 * seconds instead of propagating the failure into the RSC stream.
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
    // One refresh per stale window per isolate — every concurrent stale
    // request used to spawn its OWN loader run (CPU/subrequest multiplication
    // under bursts, which is exactly when Workers limits get hit).
    let refresh = refreshing.get(key);
    if (!refresh) {
      refresh = loader()
        .then(async (value) => {
          cacheSet(key, value, ttlMs);
          await l2Put(key, value, ttlMs);
        })
        .finally(() => {
          refreshing.delete(key);
        })
        .catch(() => undefined);
      refreshing.set(key, refresh);
      runInBackground(async () => {
        await refresh;
      });
    }
    return l2.value as T;
  }

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) {
    return pending.catch((error) => serveStaleOnError<T>(key, ttlMs, error));
  }
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
  // Each caller attaches its own fallback (the shared inflight promise stays
  // raw so concurrent awaiters each degrade independently).
  return promise.catch((error) => serveStaleOnError<T>(key, ttlMs, error));
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
  refreshing.clear();
}

/**
 * Test/verification hook — force a key into the expired-but-retained
 * fallback state so serveStaleOnError paths can be exercised in tests.
 */
export function cacheSetExpiredForTesting<T>(key: string, value: T): void {
  store.set(key, {
    value,
    expiresAt: Date.now() - 1,
    size: estimateSize(value),
  });
}
