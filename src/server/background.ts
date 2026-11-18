/**
 * TereaCOD — deferred background work.
 *
 * Runs `fn` via the Workers execution context (waitUntil) when available so
 * fire-and-forget work (maintenance sweeps, session touches) outlives the
 * response instead of racing it. An un-awaited floating promise both risks
 * being cut off mid-write when the response finishes and keeps consuming
 * isolate CPU concurrently with the response — on the Workers free plan
 * (~10 ms/request) that contention is exactly the kind of silent overhead
 * that surfaces as intermittent 1102/500s under load.
 *
 * Errors are swallowed: every call site here is best-effort housekeeping
 * whose failure must never affect the response.
 */
export function runInBackground(fn: () => Promise<unknown>): void {
  void (async () => {
    try {
      // Dynamic import — the module is only present in the OpenNext Workers
      // bundle; dev (bun) and Node standalone fall through to the branch below.
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      getCloudflareContext().ctx.waitUntil(
        Promise.resolve(fn()).catch(() => undefined)
      );
    } catch {
      // No execution context — run inline, best-effort, same as before.
      await Promise.resolve(fn()).catch(() => undefined);
    }
  })();
}
