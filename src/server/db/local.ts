/**
 * TereaCOD — local SQLite driver (runtime-adaptive).
 *
 * Local development runs the Next.js server under Node (node:sqlite) while
 * tooling (seed scripts) runs under Bun (bun:sqlite). Both engines expose
 * the same statement surface we need, so this driver adapts at runtime and
 * keeps one implementation. Applies migrations from /migrations/*.sql on
 * first use.
 */

import { readFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import type { BatchStatement, DbRow, RunResult } from "@/server/db/client";

/** Minimal structural surface shared by node:sqlite and bun:sqlite. */
interface SqlStatement {
  run(...params: unknown[]): { changes: number | bigint };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqlStatement;
  close(): void;
}

export type LocalDb = {
  all<T = DbRow>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = DbRow>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<RunResult>;
  batch(statements: BatchStatement[]): void;
  /** Raw handle for the seed script (transactions, bulk exec). */
  raw(): SqliteDatabase;
};

const DB_DIR = path.join(process.cwd(), "db");
// LOCAL_DB_PATH lets scripts/tests point the local driver at a throwaway
// database file (e.g. a copy in /tmp) without touching the dev store. The
// Workers runtime never loads this module, so the override is dev-only.
const DB_FILE = process.env.LOCAL_DB_PATH
  ? path.resolve(process.env.LOCAL_DB_PATH)
  : path.join(DB_DIR, "tereacod.db");
const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

let instance: SqliteDatabase | null = null;
let migrationsApplied = false;

/**
 * Runtime-adaptive open: bun:sqlite under Bun, node:sqlite under Node.
 *
 * Loaded via `process.getBuiltinModule` (Bun ≥1.1 / Node ≥22.3) — a plain
 * runtime API call, NOT an `import()` expression. This is deliberate: every
 * import() form in this module is unbuildable for the Worker target —
 *   • a literal specifier (`import("bun:sqlite")`) gets const-folded by
 *     Turbopack into the server chunks, and OpenNext's esbuild step (running
 *     under Node, targeting workerd) then fails with
 *     `Could not resolve "bun:sqlite"`;
 *   • a variable specifier (`import(spec)`) hard-fails `next build` with
 *     "Module not found" because Turbopack cannot analyze dynamic requests.
 * `getBuiltinModule` is invisible to both bundlers, resolved by the actual
 * runtime, and only ever called when this local fallback executes — which on
 * Workers it never does (client.ts loads this driver only when the D1
 * binding is absent).
 */
async function openDatabase(file: string): Promise<SqliteDatabase> {
  const versions = (process.versions ?? {}) as unknown as Record<
    string,
    string | undefined
  >;
  const flavor = versions.bun ? "bun" : "node";
  const spec = `${flavor}:sqlite`;

  const getBuiltin = (
    process as unknown as { getBuiltinModule?: (id: string) => unknown }
  ).getBuiltinModule;
  if (typeof getBuiltin !== "function") {
    throw new Error(
      `Local SQLite requires process.getBuiltinModule (Bun >= 1.1 or Node >= 22.3) to load "${spec}". ` +
        `Workers use the D1 binding instead and never load this driver.`
    );
  }

  let loaded: unknown;
  try {
    loaded = getBuiltin.call(process, spec);
  } catch {
    loaded = undefined;
  }
  if (!loaded) {
    throw new Error(
      `Runtime "${flavor}" does not provide the "${spec}" builtin module.`
    );
  }

  if (flavor === "bun") {
    const mod = loaded as { Database: new (path: string) => SqliteDatabase };
    return new mod.Database(file);
  }

  const mod = loaded as {
    DatabaseSync: new (path: string) => SqliteDatabase;
  };
  return new mod.DatabaseSync(file);
}

async function openRaw(): Promise<SqliteDatabase> {
  if (instance) return instance;
  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
  const db = await openDatabase(DB_FILE);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  // The dev server and bun scripts (seed, smoke) share the database file;
  // without a busy timeout any lock contention surfaces as an immediate
  // SQLITE_BUSY throw instead of a short, almost-always-successful wait.
  db.exec("PRAGMA busy_timeout = 5000;");
  instance = db;
  return db;
}

async function applyMigrations(db: SqliteDatabase): Promise<void> {
  if (migrationsApplied) return;
  db.exec(
    `CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);`
  );
  const appliedRows = db.prepare(`SELECT name FROM _migrations`).all() as Array<{ name: string }>;
  const applied = new Set(appliedRows.map((r) => r.name));

  let files: string[] = [];
  try {
    files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    files = [];
  }

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare(`INSERT INTO _migrations (name, applied_at) VALUES (?, ?)`).run(
        file,
        new Date().toISOString()
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }
  migrationsApplied = true;
}

let singleton: LocalDb | null = null;
let initPromise: Promise<LocalDb> | null = null;

export function getLocalDb(): Promise<LocalDb> {
  if (singleton) return Promise.resolve(singleton);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await openRaw();
    await applyMigrations(db);

    const handle: LocalDb = {
      async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
        return db.prepare(sql).all(...params) as T[];
      },
      async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
        const row = db.prepare(sql).get(...params);
        return ((row as T | undefined) ?? null) as T | null;
      },
      async run(sql: string, params: unknown[] = []): Promise<RunResult> {
        const result = db.prepare(sql).run(...params);
        return { changes: Number(result.changes ?? 0) };
      },
      batch(statements: BatchStatement[]): void {
        db.exec("BEGIN");
        try {
          for (const stmt of statements) {
            db.prepare(stmt.sql).run(...(stmt.params ?? []));
          }
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
      raw(): SqliteDatabase {
        return db;
      },
    };

    singleton = handle;
    return handle;
  })();

  // A transient failure (FS hiccup, migration error) must not poison the
  // cached promise for the lifetime of the process — clear it so the next
  // caller retries initialization.
  initPromise.catch(() => {
    if (initPromise) {
      initPromise = null;
    }
  });

  return initPromise;
}

/** Used by scripts to close cleanly. */
export function closeLocalDb(): void {
  if (instance) {
    instance.close();
    instance = null;
    singleton = null;
    migrationsApplied = false;
    initPromise = null;
  }
}
