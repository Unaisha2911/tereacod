/**
 * TereaCOD — OpenNext Cloudflare adapter configuration.
 *
 * Consumed by `opennextjs-cloudflare build` (bun run cf:build/preview/deploy).
 * The R2 incremental cache keeps ISR/prerender cache entries across isolates
 * and deploys instead of per-isolate memory. Binding name must match
 * wrangler.toml (NEXT_INC_CACHE_R2_BUCKET).
 */

import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

const openNextConfig = {
  ...defineCloudflareConfig({
    incrementalCache: r2IncrementalCache,
  }),
  /**
   * CRITICAL — breaks an infinite build recursion.
   *
   * By default the OpenNext adapter builds the Next.js app by re-running the
   * package manager's `build` script (`bun run build` / `npm run build`). Our
   * `build` script IS `opennextjs-cloudflare build`, so the default would make
   * the build invoke itself forever (CI hangs until Workers Builds times out).
   *
   * `buildCommand` overrides that default and points at a Next.js-only script.
   * The adapter injects NEXT_PRIVATE_STANDALONE=true into it, which is what
   * makes `next build` emit the standalone output the adapter requires.
   */
  buildCommand: "bun run build:next",
};

export default openNextConfig;
