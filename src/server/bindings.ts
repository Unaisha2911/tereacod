/**
 * TereaCOD — Cloudflare binding injection (Workers runtime).
 *
 * Repositories talk to storage through structural interfaces (D1DatabaseLike,
 * MediaR2Like, KVNamespaceLike) read from globalThis (see env.ts and kv.ts).
 * In local development those globals stay unset and the drivers fall back to
 * runtime SQLite (db/tereacod.db) and the kv_store table.
 *
 * On Cloudflare Workers, the OpenNext adapter exposes the real bindings via
 * getCloudflareContext().env. This module maps them onto the globals the app
 * expects — once per isolate, lazily, on first storage access — and mirrors
 * any string vars/secrets into process.env as a belt-and-suspenders fallback
 * for the module-load-time constants in env.ts.
 *
 * Server-only. Never imported by client code.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1DatabaseLike, MediaR2Like } from "@/server/env";
import type { KVNamespaceLike } from "@/server/kv";

let injected = false;

/** True once Worker bindings have been mapped onto the globalThis contract. */

/**
 * Idempotent, lazy binding injection. Safe to call on every storage access:
 * outside Workers (bun dev / Node standalone) getCloudflareContext() throws
 * and the local drivers remain in charge.
 */
export function injectWorkerBindings(): boolean {
  if (injected) return true;

  try {
    const { env } = getCloudflareContext() as unknown as {
      env: Record<string, unknown>;
    };
    if (!env) return false;

    // Mirror string vars/secrets into process.env without overriding values
    // that were already present (keeps .dev.vars / shell precedence honest).
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === "string" && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }

    if (env.DB) {
      globalThis.__TereaCOD_D1__ = env.DB as D1DatabaseLike;
    }
    if (env.MEDIA) {
      globalThis.__TereaCOD_MEDIA_R2__ = env.MEDIA as MediaR2Like;
    }
    if (env.SETTINGS) {
      globalThis.__TereaCOD_KV__ = {
        ...(globalThis.__TereaCOD_KV__ ?? {}),
        SETTINGS: env.SETTINGS as KVNamespaceLike,
      };
    }

    injected = Boolean(
      globalThis.__TereaCOD_D1__ || globalThis.__TereaCOD_MEDIA_R2__ || globalThis.__TereaCOD_KV__
    );
    return injected;
  } catch {
    // Not running on Workers — local drivers stay in charge.
    return false;
  }
}
