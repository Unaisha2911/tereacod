/**
 * TereaCOD — one-off production patch: official WhatsApp/contact number.
 *
 * WHY THIS EXISTS: the storefront header/footer/contact all render
 * `settings.contact.*` from the production KV document `settings:site`.
 * The deployed data still carries the seed placeholder
 * (+971 50 000 0000 / wa.me/971500000000). The code fallbacks were
 * updated to the official number, but KV data wins at runtime — so the
 * live number must be patched in the stored document, not just in code.
 *
 * This script patches ONLY the two contact fields in the EXISTING
 * production document (unlike `db:seed:kv:remote`, which overwrites the
 * whole document from the local export and would clobber any admin edits
 * made on production since the last export).
 *
 * Usage (requires wrangler auth — same as `cf:deploy`):
 *   bun scripts/update-prod-whatsapp.ts --remote
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const OFFICIAL_NUMBER = "+971 50 259 0424";
const PLACEHOLDER_PHONE = "+971 50 000 0000";

const MODE = process.argv.includes("--remote")
  ? "remote"
  : process.argv.includes("--local")
    ? "local"
    : null;
if (!MODE) {
  console.error("Usage: bun scripts/update-prod-whatsapp.ts --remote | --local");
  process.exit(1);
}

const ROOT = process.cwd();
const tmpDir = path.join(ROOT, "scripts", ".tmp-kv-patch");
mkdirSync(tmpDir, { recursive: true });
const tmpPath = path.join(tmpDir, "settings-site.json");
const modeFlag = MODE === "remote" ? "--remote" : "--local";

function run(args: string[]): void {
  const result = spawnSync("bunx", args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`wrangler exited with code ${result.status}`);
  }
}

console.log(`• kv get settings:site (${MODE})`);
run(["wrangler", "kv", "key", "get", "settings:site", "--binding", "SETTINGS", modeFlag, "--path", tmpPath]);

if (!existsSync(tmpPath)) {
  console.error("✗ KV get did not produce a file — check wrangler auth and binding.");
  process.exit(1);
}

const raw = readFileSync(tmpPath, "utf8");
const settings = JSON.parse(raw) as {
  contact?: { phone?: string; whatsapp?: string; [key: string]: unknown };
  [key: string]: unknown;
};
settings.contact = settings.contact ?? {};

const before = { phone: settings.contact.phone, whatsapp: settings.contact.whatsapp };
settings.contact.phone = before.phone === PLACEHOLDER_PHONE || !before.phone ? OFFICIAL_NUMBER : before.phone;
settings.contact.whatsapp = OFFICIAL_NUMBER;

writeFileSync(tmpPath, JSON.stringify(settings, null, 2), "utf8");

console.log(
  `• patching contact.phone: "${before.phone}" -> "${settings.contact.phone}", contact.whatsapp: "${before.whatsapp}" -> "${settings.contact.whatsapp}"`
);
run(["wrangler", "kv", "key", "put", "settings:site", "--path", tmpPath, "--binding", "SETTINGS", modeFlag]);

// Cache note: settings are memoized ~60s (CACHE_TTL.settings) — the new
// number appears on the site within a minute of this write.
unlinkSync(tmpPath);
console.log("✓ done — the storefront shows the official number within ~60s (settings TTL).");
