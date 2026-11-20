/**
 * CLIENT FETCH with transient retry.
 * ----------------------------------
 * The storefront hydrates on every page load (bootstrap + saved items +
 * catalog mirror subsets). Production runs on Workers where the API layer
 * occasionally answers a transient 5xx (cold isolate, D1/KV blip, CPU-limit
 * burst) — and until now a single failed GET left the shell unhydrated for
 * that whole page view (missing cart badge, error states in views — the
 * "sometimes something went wrong when I refresh" reports).
 *
 * This helper retries ONLY transient failures (network errors, 408/429/5xx)
 * with a short bounded backoff — two extra attempts by default. Non-retryable
 * statuses (401/403/404/422 …) surface immediately, exactly like a plain
 * fetch. Mutating verbs are NOT auto-retried by callers (double-submission
 * risk); this helper is for idempotent GETs.
 */

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** True when the failure looks transient and a retry may succeed. */
function isTransientFailure(error: unknown, status?: number): boolean {
  if (status !== undefined) return RETRYABLE_STATUS.has(status);
  // Network-layer failure (offline blip, aborted connection, DNS hiccup).
  return error instanceof TypeError || error instanceof DOMException;
}

/**
 * Fetch JSON with bounded transient retry. Throws the last error after the
 * final attempt — callers keep their existing catch handling.
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  init?: RequestInit,
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let status: number | undefined;
    try {
      const response = await fetch(url, {
        ...init,
        headers: { accept: "application/json", ...(init?.headers ?? {}) },
      });
      status = response.status;
      if (!response.ok) {
        const error = new Error(`Request failed (${response.status})`);
        if (attempt === attempts || !isTransientFailure(error, status)) throw error;
        lastError = error;
      } else {
        return (await response.json()) as T;
      }
    } catch (error) {
      if (status !== undefined) throw error; // non-ok status already decided above
      if (attempt === attempts || !isTransientFailure(error)) throw error;
      lastError = error;
    }
    // ~250ms then ~750ms — short enough to stay invisible inside hydration.
    await sleep(attempt === 1 ? 250 : 750);
  }
  throw lastError;
}
