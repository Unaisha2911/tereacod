/**
 * TereaCOD — unified database client.
 *
 * Two drivers behind one interface:
 *  • Workers: Cloudflare D1 binding injected into globalThis.__TereaCOD_D1__
 *    at Worker boot (deploy wiring — see docs/BACKEND-ARCHITECTURE.md §16).
 *  • Local/sandbox: runtime-adaptive SQLite (node:sqlite / bun:sqlite) over
 *    db/tereacod.db, with the exact same migrations applied on first use.
 *
 * All methods are async so repository code is driver-agnostic and identical
 * in both environments. Parameterized statements only — never string-built SQL.
 */

import { APP_ENV, D1DatabaseLike } from "@/server/env";
import type { LocalDb } from "@/server/db/local";
import { injectWorkerBindings } from "@/server/bindings";

export interface DbRow {
  [key: string]: unknown;
}

export interface RunResult {
  changes: number;
}

export interface BatchStatement {
  sql: string;
  params?: unknown[];
}

export interface DbClient {
  all<T = DbRow>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = DbRow>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<RunResult>;
  /** All-or-nothing batch (D1 batch / local explicit transaction). */
  batch(statements: BatchStatement[]): Promise<void>;
  /** Driver label for logging. */
  readonly driver: "d1" | "local";
}

class LocalClient implements DbClient {
  readonly driver = "local" as const;
  constructor(private readonly db: LocalDb) {}

  async all<T = DbRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.all<T>(sql, params);
  }

  async get<T = DbRow>(sql: string, params: unknown[] = []): Promise<T | null> {
    return this.db.get<T>(sql, params);
  }

  async run(sql: string, params: unknown[] = []): Promise<RunResult> {
    return this.db.run(sql, params);
  }

  async batch(statements: BatchStatement[]): Promise<void> {
    this.db.batch(statements);
  }
}

class D1Client implements DbClient {
  readonly driver = "d1" as const;
  constructor(private readonly d1: D1DatabaseLike) {}

  async all<T = DbRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.d1.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.all<T>();
    return result.results ?? [];
  }

  async get<T = DbRow>(sql: string, params: unknown[] = []): Promise<T | null> {
    const stmt = this.d1.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    return bound.first<T>();
  }

  async run(sql: string, params: unknown[] = []): Promise<RunResult> {
    const stmt = this.d1.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.run();
    return { changes: result.meta?.changes ?? 0 };
  }

  async batch(statements: BatchStatement[]): Promise<void> {
    const prepared = statements.map((s) => {
      const stmt = this.d1.prepare(s.sql);
      return s.params && s.params.length > 0 ? stmt.bind(...s.params) : stmt;
    });
    await this.d1.batch(prepared);
  }
}

let cached: DbClient | null = null;
let initPromise: Promise<DbClient> | null = null;

/** Singleton db client — D1 when the binding exists, local SQLite otherwise. */
export async function getDb(): Promise<DbClient> {
  if (cached) return cached;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Map real Worker bindings onto the globalThis contract (no-op locally).
    injectWorkerBindings();
    const d1 = globalThis.__TereaCOD_D1__;
    if (d1) {
      cached = new D1Client(d1);
    } else {
      // Lazy on purpose: the local SQLite driver (node:fs / bun:sqlite) must
      // never be evaluated on the Worker boot path. On Workers the D1 binding
      // always exists, so this dynamic import is only reached in local dev.
      const { getLocalDb } = await import("@/server/db/local");
      const local = await getLocalDb();
      cached = new LocalClient(local);
    }
    return cached;
  })();

  return initPromise;
}

/** Test/seed helper: reset the cached client (e.g. after DB file swap). */

export { APP_ENV };
