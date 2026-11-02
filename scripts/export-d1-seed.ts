/**
 * TereaCOD — D1 seed exporter.
 *
 * Turns the seeded local SQLite database (db/tereacod.db, produced by
 * `bun run db:seed`) into deployment artifacts for Cloudflare:
 *
 *   1. scripts/seed-d1.sql      → applied with:
 *        wrangler d1 execute DB --remote --file scripts/seed-d1.sql
 *   2. scripts/seed-kv/*.json   → Workers KV documents (settings:site,
 *      settings:delivery, settings:features). On Workers the settings repo
 *      reads the KV *binding* with no D1 fallback (src/server/kv.ts), so the
 *      SQL dump alone is not enough. Applied with:
 *        bun scripts/kv-remote.ts --remote
 *
 * Semantics: the dump makes remote D1 an exact copy of the local seeded DB.
 * EVERY non-ephemeral table is wiped first (children before parents), then
 * every table that holds rows locally is re-inserted (parents first). The
 * wipe deliberately covers ALL content tables — even ones the local seed
 * leaves empty — because the remote target may still hold rows from an
 * earlier deployment (e.g. a former demo catalog), and a leftover child row
 * (products referencing a category, order payments, …) aborts the apply with
 * "FOREIGN KEY constraint failed" the moment its parent is deleted. Tables
 * in SKIP_TABLES are never touched; every FK edge from them into the wipe
 * scope is ON DELETE CASCADE / SET NULL, so the wipe stays FK-safe. This is
 * a bootstrap / demo-reset tool, not a merge tool.
 *
 * Safety guard: an unseeded local DB (no navigation / RBAC / admin /
 * settings rows) would wipe the storefront chrome on the remote and
 * re-insert nothing. The export refuses that — run `bun run db:seed` first
 * (idempotent, catalog untouched) or override deliberately with
 * ALLOW_PARTIAL_SEED_EXPORT=1.
 *
 * NO explicit transaction statements: production D1 rejects
 * BEGIN/COMMIT/SAVEPOINT in `wrangler d1 execute --file` ("please use
 * state.storage.transaction() instead"). miniflare --local is more lenient,
 * which is why this only surfaced on the first remote apply. Correctness is
 * guaranteed by statement ORDER instead: children are deleted before parents
 * (RESTRICT edges) and parents are inserted before children (FK targets).
 * wrangler's remote import additionally reports rollback-on-failure.
 *
 * Excluded from the dump:
 *   - sqlite internals, FTS5 virtual table + shadow tables (the product_fts
 *     triggers repopulate the index from the `product_fts` rows we insert);
 *   - `_migrations` (local-loader bookkeeping; remote D1 is versioned by
 *     wrangler's own `d1_migrations` table);
 *   - ephemeral runtime tables (sessions, carts, job_queue, tokens, …).
 *
 * Usage: bun scripts/export-d1-seed.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getLocalDb, closeLocalDb } from "../src/server/db/local";

/* ----------------------------- configuration ------------------------------ */

const ROOT = process.cwd();
const OUT_SQL = path.join(ROOT, "scripts", "seed-d1.sql");
const OUT_KV_DIR = path.join(ROOT, "scripts", "seed-kv");

/** Runtime/ephemeral state that must never be promoted to production. */
const SKIP_TABLES = new Set([
  "_migrations", // local loader bookkeeping (remote uses wrangler d1_migrations)
  "job_queue", // runtime outbox
  "sessions",
  "idempotency_keys",
  "carts",
  "cart_items",
  "password_reset_tokens",
  "email_verification_tokens",
]);

/** Multi-row INSERT budget (D1 max SQL statement length is 100 KB). */
const MAX_STATEMENT_CHARS = 48_000;
const MAX_ROWS_PER_STATEMENT = 40;

/* --------------------------------- helpers -------------------------------- */

type Value = string | number | bigint | null | Uint8Array;

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlValue(value: Value): string {
  if (value === null) return "NULL";
  switch (typeof value) {
    case "number":
      return String(value);
    case "bigint":
      return String(value);
    case "string":
      return sqlString(value);
    case "object": {
      if (value instanceof Uint8Array) {
        return `X'${Array.from(value, (b) => b.toString(16).padStart(2, "0")).join("")}'`;
      }
      const ctor = (value as { constructor?: { name?: string } }).constructor;
      throw new Error(`Unsupported column type: ${ctor?.name ?? "unknown"}`);
    }
    default:
      throw new Error(`Unsupported column value: ${String(value)}`);
  }
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/* ---------------------------------- load ---------------------------------- */

const db = (await getLocalDb()).raw();

interface TableInfo {
  name: string;
  rows: Array<Record<string, Value>>;
  columns: string[];
}

// Enumerate user tables; drop virtual tables (CREATE VIRTUAL TABLE …) and
// their shadow tables (<virtual>_data/_idx/_content/_docsize/_config).
const master = db
  .prepare(
    `SELECT name, sql FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY rowid`
  )
  .all() as Array<{ name: string; sql: string | null }>;

const virtualTables = master.filter((t) => t.sql?.startsWith("CREATE VIRTUAL")).map((t) => t.name);
const shadowPrefixes = virtualTables.map((v) => `${v}_`);

const tableNames = master
  .map((t) => t.name)
  .filter((name) => {
    if (SKIP_TABLES.has(name)) return false;
    if (virtualTables.includes(name)) return false;
    if (shadowPrefixes.some((p) => name.startsWith(p))) return false;
    return true;
  });

// WIPE scope — every user table that is not ephemeral/skip-listed, INCLUDING
// tables the local seed does not fill: the remote target may still hold rows
// from an earlier deployment, and any leftover child row (e.g. old demo
// products referencing a category) aborts the apply with
// "FOREIGN KEY constraint failed" the moment its parent is deleted.
const wipeNames = tableNames;

// INSERT scope — only tables that actually contain data locally.
const tables: TableInfo[] = [];
const rowsByName = new Map<string, TableInfo>();
for (const name of wipeNames) {
  const count = (db.prepare(`SELECT COUNT(*) AS c FROM ${quoteIdent(name)}`).get() as { c: number }).c;
  if (count === 0) continue;
  const columns = (db.prepare(`PRAGMA table_info(${quoteIdent(name)})`).all() as Array<{ name: string }>).map(
    (c) => c.name
  );
  const rows = db.prepare(`SELECT * FROM ${quoteIdent(name)}`).all() as Array<Record<string, Value>>;
  const info: TableInfo = { name, rows, columns };
  tables.push(info);
  rowsByName.set(name, info);
}

/* ------------------------------ safety guard ------------------------------ */

// An unseeded local DB exports a dump that wipes navigation/legal/RBAC/admin
// on the remote and re-inserts nothing — breaking the storefront chrome and
// the admin login. Refuse unless the operator overrides deliberately.
const isSeeded =
  (rowsByName.get("navigation_items")?.rows.length ?? 0) > 0 &&
  (rowsByName.get("roles")?.rows.length ?? 0) > 0 &&
  (rowsByName.get("users")?.rows.length ?? 0) > 0 &&
  (rowsByName.get("kv_store")?.rows.length ?? 0) > 0;
if (!isSeeded && !process.env.ALLOW_PARTIAL_SEED_EXPORT) {
  console.error("");
  console.error("✗ Local DB looks UNSEEDED (no navigation/roles/users/settings rows).");
  console.error("  Applying this dump would wipe those tables on the remote and");
  console.error("  re-insert nothing — breaking storefront chrome and admin login.");
  console.error("");
  console.error("  Fix:    bun run db:seed      # idempotent; catalog is untouched");
  console.error("  Then:   bun run db:seed:export");
  console.error("  Override (deliberate): ALLOW_PARTIAL_SEED_EXPORT=1 bun run db:seed:export");
  closeLocalDb();
  process.exit(1);
}

// Topological order over the WIPE scope: parents (referenced) before
// children (referencing). Ties broken by original sqlite_master order for
// deterministic output.
const position = new Map(wipeNames.map((name, i) => [name, i]));
const parentsOf = new Map<string, Set<string>>();
for (const name of wipeNames) {
  const fks = db.prepare(`PRAGMA foreign_key_list(${quoteIdent(name)})`).all() as Array<{ table: string }>;
  const parents = new Set<string>();
  for (const fk of fks) if (position.has(fk.table) && fk.table !== name) parents.add(fk.table);
  parentsOf.set(name, parents);
}

const ordered: string[] = [];
const placed = new Set<string>();
while (ordered.length < wipeNames.length) {
  let progressed = false;
  for (const name of wipeNames) {
    if (placed.has(name)) continue;
    const parents = parentsOf.get(name)!;
    if ([...parents].every((p) => placed.has(p))) {
      ordered.push(name);
      placed.add(name);
      progressed = true;
    }
  }
  if (!progressed) {
    throw new Error(`Circular foreign-key dependency among: ${wipeNames.filter((t) => !placed.has(t)).join(", ")}`);
  }
}

/* -------------------------------- emit SQL -------------------------------- */

const lines: string[] = [];
const totalRows = tables.reduce((sum, t) => sum + t.rows.length, 0);

lines.push(`-- TereaCOD — D1 seed dump (generated by scripts/export-d1-seed.ts)`);
lines.push(`-- Source: db/tereacod.db | generated: ${new Date().toISOString()}`);
lines.push(`-- Tables: ${tables.length} seeded / ${wipeNames.length} wiped | rows: ${totalRows}`);
lines.push(`--`);
lines.push(`-- ⚠ Applying this file RESETS ${wipeNames.length} content tables to the local seed`);
lines.push(`--   content (tables with no local rows end up EMPTY). Target must be the`);
lines.push(`--   bootstrap D1 database (or a deliberate demo reset).`);
lines.push(`-- Apply: wrangler d1 execute DB --remote --file scripts/seed-d1.sql`);
lines.push(`-- NOTE: statements are FK-order-dependent (ALL tables wiped children-first,`);
lines.push(`-- then parents inserted before children) — no explicit BEGIN/COMMIT,`);
lines.push(`-- remote D1 forbids those.`);
lines.push(``);

// Phase 1 — wipe: EVERY content table, children before parents (RESTRICT
// edges stay satisfiable) — including tables the local seed leaves empty,
// because the remote may still hold stale rows from an earlier deployment.
lines.push(``);
for (const name of [...ordered].reverse()) {
  lines.push(`DELETE FROM ${quoteIdent(name)};`);
}

// Phase 2 — insert: parents before children (FK targets exist before use).
// Tables without local rows were wiped above and stay empty.
for (const name of ordered) {
  const table = rowsByName.get(name);
  if (!table) continue;
  const cols = table.columns.map(quoteIdent).join(", ");
  lines.push(``);
  lines.push(`-- ${table.name} (${table.rows.length} rows)`);

  let batch: string[] = [];
  let batchChars = 0;
  const flush = () => {
    if (batch.length === 0) return;
    lines.push(`INSERT INTO ${quoteIdent(name)} (${cols}) VALUES`);
    lines.push(batch.join(",\n") + ";");
    batch = [];
    batchChars = 0;
  };

  for (const row of table.rows) {
    const tuple = `(${table.columns.map((c) => sqlValue(row[c] ?? null)).join(", ")})`;
    if (batch.length > 0 && (batchChars + tuple.length > MAX_STATEMENT_CHARS || batch.length >= MAX_ROWS_PER_STATEMENT)) {
      flush();
    }
    batch.push(tuple);
    batchChars += tuple.length;
  }
  flush();
}

lines.push(``);

mkdirSync(path.dirname(OUT_SQL), { recursive: true });
writeFileSync(OUT_SQL, lines.join("\n"), { mode: 0o600 });

/* ------------------------------- emit KV files ----------------------------- */

const kvRows = db.prepare(`SELECT key, value_json FROM kv_store ORDER BY key`).all() as Array<{
  key: string;
  value_json: string;
}>;

mkdirSync(OUT_KV_DIR, { recursive: true });
const manifest: Record<string, string> = {};
for (const row of kvRows) {
  const file = `${row.key.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`;
  // Verbatim value: the file content IS the KV value (JSON.stringify'd doc).
  writeFileSync(path.join(OUT_KV_DIR, file), row.value_json, { mode: 0o600 });
  manifest[row.key] = file;
}
writeFileSync(path.join(OUT_KV_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });

closeLocalDb();

/* --------------------------------- summary -------------------------------- */

console.log("✓ D1 seed export complete");
if (!process.env.ADMIN_PASSWORD) {
  console.log("");
  console.log("⚠ ADMIN_PASSWORD was not set when the local DB was seeded — the exported");
  console.log("  admin hash derives from the documented default password. Rotate it right");
  console.log("  after applying this dump: bun run admin:password:set:remote");
}
console.log(`  wipe: ${wipeNames.length} tables (children first)`);
for (const name of ordered) {
  const t = rowsByName.get(name);
  if (!t) continue;
  console.log(`  ${String(t.rows.length).padStart(6)}  ${name}`);
}
console.log(`→ ${path.relative(ROOT, OUT_SQL)} (${totalRows} rows inserted, ${wipeNames.length} tables wiped)`);
console.log(`→ ${path.relative(ROOT, OUT_KV_DIR)}/ (${Object.keys(manifest).join(", ")})`);
console.log("");
console.log("Next (after `bun run db:migrate:remote`):");
console.log("  1. bun run db:seed:remote     # wrangler d1 execute DB --remote --file scripts/seed-d1.sql");
console.log("  2. bun run db:seed:kv:remote  # settings:site / delivery / features → Workers KV");
console.log("  3. bun run admin:password:set:remote  # rotate the seeded admin password");
