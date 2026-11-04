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
  // busy_timeout MUST come first: the pragmas below take locks on a fresh
  // database file, and `next build` collects page data with SEVEN parallel
  // workers that all open this same new file. Without a timeout already
  // installed, they throw SQLITE_BUSY immediately — CI surfaced this as
  // "Error: database is locked → Failed to collect page data".
  db.exec("PRAGMA busy_timeout = 15000;");
  // journal_mode = WAL additionally needs a brief EXCLUSIVE lock, and SQLite
  // does NOT invoke the busy handler for it — a racing worker can fail it
  // outright even with busy_timeout set. Whoever sets WAL first wins; the
  // losers just re-check, so retry until the mode actually reads back "wal".
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      db.exec("PRAGMA journal_mode = WAL;");
      break;
    } catch (error) {
      const mode = (db.prepare("PRAGMA journal_mode").get() as { journal_mode?: string })?.journal_mode;
      if (mode === "wal") break;
      if (attempt === 10 || !isBusyError(error)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100 * attempt);
    }
  }
  db.exec("PRAGMA foreign_keys = ON;");
  instance = db;
  return db;
}

/** SQLITE_BUSY / "database is locked" — retryable with a short backoff. */
function isBusyError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const message = (error as Error)?.message ?? "";
  return code === "SQLITE_BUSY" || code === "ERR_SQLITE_BUSY" || /database is locked/i.test(message);
}

/** Synchronous sleep usable from the sync migration path (Bun/Node ≥ 22). */
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Applies ONE migration file under BEGIN IMMEDIATE.
 *
 * IMMEDIATE is the crux: the write lock is taken BEFORE any read, so two
 * racing workers can never interleave inside one script. The natural
 * alternative — BEGIN (deferred) + first-statement upgrade — hits WAL's
 * snapshot rule: a txn that READ before another worker committed cannot
 * upgrade to write at all (SQLITE_BUSY_SNAPSHOT, which busy_timeout cannot
 * fix and bun surfaces as a bare "database is locked"), and the aborted
 * script left half-applied schemas behind (CI symptom: the index statement
 * after CREATE TABLE job_queue failing with "no such table").
 *
 * With the lock held: re-read the applied set (fresh, serialized), skip if
 * another worker already landed this file, else exec + mark. Transient
 * conflicts retry with backoff; genuine SQL errors surface with the file
 * name after the short retry window.
 */
function applyMigrationFile(db: SqliteDatabase, file: string, sql: string, attempt = 1): void {
  const MAX_ATTEMPTS = 8;
  try {
    db.exec("BEGIN IMMEDIATE");
    try {
      const applied = new Set(
        (db.prepare(`SELECT name FROM _migrations`).all() as Array<{ name: string }>).map((r) => r.name)
      );
      if (applied.has(file)) {
        db.exec("COMMIT"); // already applied by a racing worker — skip
        return;
      }
      db.exec(sql);
      db.prepare(`INSERT INTO _migrations (name, applied_at) VALUES (?, ?)`).run(
        file,
        new Date().toISOString()
      );
      db.exec("COMMIT");
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch {
        /* the transaction may already be gone — nothing to unwind */
      }
      throw error;
    }
  } catch (error) {
    if (attempt < MAX_ATTEMPTS) {
      sleepSync(120 * attempt + Math.round(Math.random() * 200));
      applyMigrationFile(db, file, sql, attempt + 1);
      return;
    }
    // Final attempt failed — attach file context, preserve the SQLITE code.
    const original = error as Error & { code?: string };
    if (isBusyError(error)) throw original;
    const wrapped = new Error(
      `Migration ${file} failed: ${original?.message ?? String(error)}`
    ) as Error & { code?: string };
    wrapped.code = original?.code;
    throw wrapped;
  }
}

async function applyMigrations(db: SqliteDatabase): Promise<void> {
  if (migrationsApplied) return;
  // Marker table first (idempotent; autocommit — busy_timeout covers the
  // wait when a racing worker holds the lock). Needed before the per-file
  // applied-set reads below.
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);`);

  let files: string[] = [];
  try {
    files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    files = [];
  }

  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    applyMigrationFile(db, file, sql);
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
