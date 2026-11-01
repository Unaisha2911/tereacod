/**
 * TereaCOD — KV abstraction.
 *
 * On Workers: uses the injected KV binding(s) (globalThis.__TereaCOD_KV__).
 * Locally: a kv_store table in SQLite with identical semantics for our use
 * cases (settings, navigation cache, feature flags).
 */

import { getDb } from "@/server/db/client";
import { injectWorkerBindings } from "@/server/bindings";

export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

declare global {
  var __TereaCOD_KV__: Record<string, KVNamespaceLike> | undefined;
}

function binding(): Record<string, KVNamespaceLike> | undefined {
  // Map real Worker KV bindings onto the globalThis contract (no-op locally).
  injectWorkerBindings();
  return globalThis.__TereaCOD_KV__;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const kv = binding();
  if (kv) {
    const raw = await kv.SETTINGS?.get(key);
    if (!raw) return null;
    // One corrupt KV value must not 500 every settings/nav/flags read.
    try {
      return JSON.parse(raw) as T;
    } catch {
      console.error(`[kv] corrupt JSON for key "${key}" — ignoring`);
      return null;
    }
  }
  const db = await getDb();
  const row = await db.get<{ value_json: string }>(
    `SELECT value_json FROM kv_store WHERE key = ?`,
    [key]
  );
  if (!row) return null;
  try {
    return JSON.parse(row.value_json) as T;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const kv = binding();
  if (kv) {
    await kv.SETTINGS?.put(key, JSON.stringify(value));
    return;
  }
  const db = await getDb();
  await db.run(
    `INSERT INTO kv_store (key, value_json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    [key, JSON.stringify(value), new Date().toISOString()]
  );
}

