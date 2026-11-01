/**
 * TereaCOD — apply the exported KV seed documents to Workers KV.
 *
 * The settings repo (src/server/repos/settings.ts) stores site settings,
 * delivery config and feature flags as KV documents. On Workers these are
 * read from the `SETTINGS` KV binding (src/server/kv.ts) — the D1 kv_store
 * table is NOT consulted, so `seed-d1.sql` alone cannot deliver settings.
 *
 * Files come from scripts/seed-kv/ (manifest.json + one file per key, the
 * file content is the KV value verbatim).
 *
 * Usage:
 *   bun scripts/kv-remote.ts --remote   # production namespace (wrangler.toml)
 *   bun scripts/kv-remote.ts --local    # local miniflare namespace (parity test)
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MODE = process.argv.includes("--local") ? "local" : process.argv.includes("--remote") ? "remote" : null;
if (!MODE) {
  console.error("Usage: bun scripts/kv-remote.ts --remote | --local");
  process.exit(1);
}

const ROOT = process.cwd();
const manifestPath = path.join(ROOT, "scripts", "seed-kv", "manifest.json");

let manifest: Record<string, string>;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, string>;
} catch {
  console.error(`✗ Cannot read ${path.relative(ROOT, manifestPath)} — run \`bun run db:seed:export\` first.`);
  process.exit(1);
}

const modeFlag = MODE === "local" ? "--local" : "--remote";
let failed = 0;

for (const [key, file] of Object.entries(manifest)) {
  const target = path.join(ROOT, "scripts", "seed-kv", file);
  console.log(`• kv put ${key}  (${modeFlag})`);
  try {
    const result = spawnSync("bunx", ["wrangler", "kv", "key", "put", key, "--path", target, "--binding", "SETTINGS", modeFlag], {
      stdio: "inherit",
    });
    if (result.status !== 0) throw new Error(`wrangler exited with code ${result.status}`);
  } catch (error) {
    console.error(`  ✗ ${key}: ${error instanceof Error ? error.message : String(error)}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`✗ ${failed} KV key(s) failed`);
  process.exit(1);
}
console.log(`✓ ${Object.keys(manifest).length} KV key(s) applied (${MODE})`);
