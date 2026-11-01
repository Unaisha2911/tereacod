/**
 * TereaCOD — admin password toolkit.
 *
 * Standalone (no project imports) so it can run anywhere Bun runs — including
 * machines where only wrangler is authenticated. Mirrors the exact algorithm
 * of src/server/password.ts (PBKDF2-SHA256, 50k iterations — see that file
 * for why it is not 600k, PHC-style string
 * `pbkdf2$sha256$<iterations>$<salt-b64>$<hash-b64>`).
 *
 * ── Mode 1: VERIFY (diagnose) ──────────────────────────────────────────────
 * Checks a candidate password against a stored hash. The hash can come from
 * stdin (pipe wrangler's JSON output) or the --hash flag:
 *
 *   bunx wrangler d1 execute DB --remote --json \
 *     --command "SELECT password_hash FROM users WHERE email='admin@tereacod.ae'" \
 *     | bun scripts/admin-password.ts verify
 *
 *   bun scripts/admin-password.ts verify --hash 'pbkdf2$sha256$…' --password '…'
 *
 * Prints MATCH or NO-MATCH (exit code 0 / 1 — scriptable).
 *
 * ── Mode 2: SET (fix) ──────────────────────────────────────────────────────
 * Generates a fresh hash for the target password and writes a surgical SQL
 * file (single UPDATE — touches nothing else), ready for:
 *
 *   bun scripts/admin-password.ts set
 *   bunx wrangler d1 execute DB --remote --file db/set-admin-password.sql
 *
 * Why a SQL file instead of `--command "UPDATE …"`: the hash contains `$`
 * characters, which bash expands inside double quotes — pasting it inline
 * silently corrupts the hash. The file is quoting-proof.
 *
 * Password resolution (both modes): --password flag > ADMIN_PASSWORD env >
 * documented default "Admin#TereaCOD2025".
 * Email resolution (set mode): --email flag > ADMIN_EMAIL env >
 * "admin@tereacod.ae".
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// MUST stay in sync with src/server/password.ts — 50k keeps deriveBits under
// Cloudflare Workers' free-plan CPU budget (10 ms); 600k throws on Workers
// and made every production sign-in fail (see that file for the full story).
const ITERATIONS = 50_000;
const KEY_LENGTH = 32;
const DEFAULT_EMAIL = "admin@tereacod.ae";
const DEFAULT_PASSWORD = "Admin#TereaCOD2025";

/* --------------------------------- args ----------------------------------- */

interface Args {
  mode: "verify" | "set";
  password?: string;
  email?: string;
  hash?: string;
}

function parseArgs(argv: string[]): Args {
  const mode = argv[0] === "set" ? "set" : argv[0] === "verify" ? "verify" : undefined;
  if (!mode) {
    console.error("Usage: bun scripts/admin-password.ts <verify|set> [--password '…'] [--email '…'] [--hash '…']");
    process.exit(2);
  }
  const args: Args = { mode };
  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i] === "--password") args.password = argv[++i];
    else if (argv[i] === "--email") args.email = argv[++i];
    else if (argv[i] === "--hash") args.hash = argv[++i];
  }
  return args;
}

/* ------------------------------- primitives -------------------------------- */

function b64encode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64decode(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_LENGTH * 8
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$sha256$${ITERATIONS}$${b64encode(salt)}$${b64encode(hash)}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.trim().split("$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2") return false;
  const [, hashName, iterationsRaw, saltB64, hashB64] = parts;
  if (hashName !== "sha256") return false;
  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  try {
    const candidate = await derive(password, b64decode(saltB64), iterations);
    return timingSafeEqual(candidate, b64decode(hashB64));
  } catch {
    return false;
  }
}

/* ------------------------------ hash extraction ---------------------------- */

/**
 * Accepts, in order of preference:
 *   1. a raw `pbkdf2$…` hash string (possibly wrapped in JSON string quotes)
 *   2. wrangler `--json` output → { result: [{ password_hash: "…" }] } (or a bare array)
 *   3. any JSON object/array containing a `password_hash` field somewhere
 *   4. raw text containing a `pbkdf2$…` token (banner noise tolerated)
 */
function extractHash(input: string): string | null {
  const text = input.trim().replace(/^"|"$/g, "");
  if (text.startsWith("pbkdf2$")) return text;

  const jsonStart = text.search(/[{[]/);
  if (jsonStart >= 0) {
    try {
      const parsed: unknown = JSON.parse(text.slice(jsonStart));
      const found = findPasswordHash(parsed);
      if (found) return found;
    } catch {
      /* fall through to token scan */
    }
  }

  const token = /pbkdf2\$[a-z0-9]+\$[0-9]+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+/.exec(text);
  return token ? token[0] : null;
}

function findPasswordHash(node: unknown, depth = 0): string | null {
  if (depth > 8 || node === null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findPasswordHash(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  const record = node as Record<string, unknown>;
  if (typeof record.password_hash === "string" && record.password_hash.startsWith("pbkdf2$")) {
    return record.password_hash;
  }
  for (const value of Object.values(record)) {
    const hit = findPasswordHash(value, depth + 1);
    if (hit) return hit;
  }
  return null;
}

async function readStdinIfPiped(): Promise<string | null> {
  if (process.stdin.isTTY) return null;
  // Node-style stream iteration — works identically under Bun and Node.
  const parts: string[] = [];
  for await (const chunk of process.stdin) parts.push(String(chunk));
  return parts.join("");
}

/* ---------------------------------- modes ---------------------------------- */

async function runVerify(args: Args, password: string): Promise<void> {
  const raw = args.hash ?? (await readStdinIfPiped());
  if (!raw || !raw.trim()) {
    console.error("✗ no hash provided — pass --hash or pipe wrangler --json output into stdin");
    process.exit(2);
  }
  const stored = extractHash(raw);
  if (!stored) {
    console.error("✗ could not find a pbkdf2$… hash in the input");
    process.exit(2);
  }
  const match = await verifyPassword(password, stored);
  console.log(`stored hash : ${stored.slice(0, 24)}… (${stored.length} chars)`);
  console.log(`candidate   : ${mask(password)}`);
  console.log(match ? "✓ MATCH — this password IS the one encoded in the stored hash" : "✗ NO-MATCH — the stored hash encodes a DIFFERENT password");
  process.exit(match ? 0 : 1);
}

async function runSet(args: Args, password: string, email: string): Promise<void> {
  const hash = await hashPassword(password);
  const now = new Date().toISOString();
  // sqlString: base64 alphabet contains no quotes; escape anyway for safety.
  const sqlHash = hash.replace(/'/g, "''");
  const sqlEmail = email.replace(/'/g, "''");

  const sql = [
    `-- TereaCOD — surgical admin password reset (generated by scripts/admin-password.ts)`,
    `-- Target   : ${email}`,
    `-- Password : ${mask(password)}`,
    `-- Generated: ${now}`,
    `--`,
    `-- Apply (from the project root, wrangler authenticated):`,
    `--   bunx wrangler d1 execute DB --remote --file db/set-admin-password.sql`,
    `--`,
    `-- Touches ONLY the password_hash + updated_at of this one user row.`,
    ``,
    `UPDATE users SET password_hash = '${sqlHash}', updated_at = '${now}' WHERE email = '${sqlEmail}';`,
    ``,
    `-- Verification row (expect the new pbkdf2$sha256$50000 prefix):`,
    `SELECT id, email, substr(password_hash, 1, 20) AS hash_prefix, status FROM users WHERE email = '${sqlEmail}';`,
    ``,
  ].join("\n");

  const outPath = "db/set-admin-password.sql";
  // The db/ folder is gitignored and does not exist in a fresh clone
  // (ENOENT on Windows otherwise).
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, sql, { mode: 0o600 });
  console.log(`✓ wrote ${outPath}`);
  console.log(`  email    : ${email}`);
  console.log(`  password : ${mask(password)}`);
  console.log(`  hash     : ${hash.slice(0, 24)}…`);
  console.log("");
  console.log("Next step (remote, one command):");
  console.log(`  bunx wrangler d1 execute DB --remote --file ${outPath}`);
  console.log("");
  console.log("Optional confirm-what-is-stored-now (run BEFORE applying, pipe into verify):");
  console.log(`  bunx wrangler d1 execute DB --remote --json \\`);
  console.log(`    --command "SELECT password_hash FROM users WHERE email='${email}'" \\`);
  console.log(`    | bun scripts/admin-password.ts verify --password '${password}'`);
}

function mask(password: string): string {
  if (password.length <= 4) return "•".repeat(password.length);
  return `${password.slice(0, 2)}${"•".repeat(Math.max(password.length - 4, 2))}${password.slice(-2)}`;
}

/* ---------------------------------- main ----------------------------------- */

const args = parseArgs(process.argv.slice(2));
const password = args.password ?? process.env.ADMIN_PASSWORD ?? DEFAULT_PASSWORD;
const email = args.email ?? process.env.ADMIN_EMAIL ?? DEFAULT_EMAIL;

if (args.mode === "verify") {
  await runVerify(args, password);
} else {
  await runSet(args, password, email);
}
