/**
 * TereaCOD — hot-path data cache.
 *
 * A tiny in-process TTL memo for read-only reference data (settings, nav,
 * categories, brands, faqs, legal, the published catalog). Pages render
 * dynamically by design (admin edits must surface without a deploy), but
 * that does NOT mean every render should re-issue the same 10 DB/KV reads —
 * this cache absorbs the repeat reads within an isolate:
 *
 *   • within a request, identical reads collapse to one query;
 *   • across requests, hot data is served from memory until the TTL
 *     elapses, so admin edits appear within seconds instead of requiring
 *     a redeploy while visitors get memory-speed responses.
 *
 * Write paths call invalidateCache(prefix) so a save reflects immediately
 * on the writing isolate; other isolates catch up when their TTL lapses.
 * Everything is best-effort: a cache miss simply falls through to the
 * repository. On Workers each isolate owns its own instance — memory cost
 * is bounded by the soft ceiling below.
 */

type Entry = { value: unknown; expiresAt: number };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/** Soft ceiling — drop expired entries first, then everything. */
const MAX_ENTRIES = 512;

/**
 * Per-data-class TTLs. The trade-off everywhere is "admin edit latency"
 * vs "repeat-request cost": reference data that almost never changes gets
 * minutes, the catalog list gets seconds so a new product surfaces fast.
 */
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

/**
 * Read-through helper: returns the cached value when fresh, otherwise runs
 * `loader`, stores the result and returns it. Concurrent callers awaiting
 * the same key share one loader promise (per-isolate dogpile protection).
 */
export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const promise = loader()
    .then((value) => {
      cacheSet(key, value, ttlMs);
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
 */
export function invalidateCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      inflight.delete(key);
    }
  }
}

/** Test/seed helper — forget everything. */
export function cacheClear(): void {
  store.clear();
  inflight.clear();
}
