/**
 * TereaCOD — transient storage-failure retry.
 *
 * WHY: production runs on Cloudflare Workers with remote D1 + KV. Both
 * occasionally fail transiently — "D1_ERROR: internal error", connection
 * resets under bursts, "database is locked" style contention, KV capacity
 * hiccups. The render path previously had ZERO tolerance: one rejected
 * read inside a page's Promise.all aborted the whole RSC stream and the
 * visitor got "Something went wrong" (HTTP 500 + React error #441 in the
 * console — the client-side echo of the server render failure). This is
 * the root cause of the intermittent 500s reported on tereacod.ae.
 *
 * A short bounded retry (2 extra attempts, ~60/180ms backoff) absorbs the
 * blips without meaningfully delaying genuinely broken requests. Permanent
 * errors (SQL syntax, missing table, constraint, auth) are NOT retried.
 */

/** Error messages considered transient and worth a retry. */
const TRANSIENT_PATTERN =
  /database is locked|sqlite_busy|sqlitebusy|locked|busy|expired|connection reset|socket hang up|econnreset|econnrefused|network|fetch failed|timeout|timed out|internal error|internal server error|d1_error|too many requests|too many concurrent|capacity|throttl|overloaded|temporarily unavailable|502|503|504|aborted|reset by peer/i;

/** Errors that will NEVER succeed on retry — fail fast, don't waste the render budget. */
const PERMANENT_PATTERN =
  /no such table|no such column|no such function|syntax error|constraint|unique violation|not authorized|unauthorized|forbidden|invalid sql|malformed sql|missing bind|invalid parameter|binding error|primary key|foreign key/i;

export function isTransientStorageError(error: unknown): boolean {
  const message =
    typeof error === "object" && error !== null
      ? String((error as { message?: unknown }).message ?? error)
      : String(error);
  if (PERMANENT_PATTERN.test(message)) return false;
  return TRANSIENT_PATTERN.test(message);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn` with up to `attempts` total tries. Retries only transient
 * storage errors; anything else (and the final attempt's failure)
 * propagates immediately to the caller.
 */
export async function withTransientRetry<T>(
  fn: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isTransientStorageError(error)) throw error;
      // Exponential-ish backoff: ~60ms, ~180ms. Kept small — the retry
      // runs inside a live SSR render; seconds of delay would hurt TTFB.
      await sleep(attempt === 1 ? 60 : 180);
    }
  }
  throw lastError;
}
