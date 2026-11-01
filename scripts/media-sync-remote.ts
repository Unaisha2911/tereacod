/**
 * TereaCOD — media sync (local sandbox → production R2).
 *
 * WHY: images uploaded through the admin in the local sandbox are stored in
 * `public/uploads/` + the durable `media_blobs` table (local SQLite only).
 * Their media_assets rows are routinely exported to D1 (seed export), but
 * the BYTES stay behind — on production those URLs 404 and the storefront
 * shows "Image unavailable". This script uploads every locally-stored media
 * file to the real R2 bucket (`tereacod-media`) under the exact key the
 * public media route reads (`<folder>/<filename>`), making the rows serve.
 *
 * Usage (run where wrangler is authenticated — `wrangler login` or
 * CLOUDFLARE_API_TOKEN set):
 *
 *   bun scripts/media-sync-remote.ts --dry-run   # list what would upload
 *   bun scripts/media-sync-remote.ts             # upload to R2
 *
 * Idempotent: re-running only re-puts the same bytes (R2 puts are upserts),
 * and assets already found in R2 are skipped unless --force is passed.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getLocalDb, closeLocalDb } from "../src/server/db/local";

const ROOT = process.cwd();
const BUCKET = "tereacod-media";
const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const TMP_DIR = path.join(ROOT, ".media-sync-tmp");

interface MediaRow {
  id: string;
  filename: string;
  folder: string;
  mime: string;
  r2_key: string;
  url: string;
}

function r2ObjectExists(key: string): boolean {
  // `r2 object get --pipe` streams the object to stdout; non-zero exit = missing.
  const proc = spawnSync(
    "bunx",
    ["wrangler", "r2", "object", "get", `${BUCKET}/${key}`, "--pipe", "--remote"],
    { stdio: "ignore" },
  );
  return proc.status === 0;
}

function putToR2(key: string, filePath: string, mime: string): boolean {
  const proc = spawnSync(
    "bunx",
    [
      "wrangler", "r2", "object", "put", `${BUCKET}/${key}`,
      "--file", filePath,
      "--content-type", mime,
      "--remote",
      ...(FORCE ? ["--force"] : []),
    ],
    { stdio: "pipe" },
  );
  if (proc.status !== 0) {
    console.error(`   put failed: ${String(proc.stderr).slice(0, 300)}`);
    return false;
  }
  return true;
}

async function main() {
  const db = await getLocalDb();

  const rows = await db.all<MediaRow>(
    `SELECT id, filename, folder, mime, r2_key, url
       FROM media_assets
      WHERE deleted_at IS NULL
        AND (r2_key LIKE 'local:%' OR url LIKE '/uploads/%')
      ORDER BY uploaded_at`,
  );

  console.log(
    `Found ${rows.length} locally-stored media asset(s)` +
      (DRY_RUN ? " (dry run)" : "") + ":",
  );
  if (rows.length === 0) { closeLocalDb(); return; }

  mkdirSync(TMP_DIR, { recursive: true });
  let uploaded = 0;
  let skipped = 0;
  let missing = 0;

  for (const row of rows) {
    // R2 key the public media route reads: strip the local: prefix.
    const key = row.r2_key.startsWith("local:") ? row.r2_key.slice(6) : `${row.folder}/${row.filename}`;
    const fsPath = path.join(ROOT, "public", "uploads", key);

    // 1. bytes: durable blob first, then the filesystem copy.
    let bytes: Buffer | null = null;
    const blob = await db.get<{ data: unknown }>(
      `SELECT data FROM media_blobs WHERE media_asset_id = ?`,
      [row.id],
    );
    if (blob?.data) {
      bytes = Buffer.from(blob.data as ArrayBuffer);
    } else if (existsSync(fsPath)) {
      bytes = readFileSync(fsPath);
    }
    if (!bytes || bytes.length === 0) {
      console.log(`✗ ${key} — no bytes found (neither media_blobs nor ${fsPath})`);
      missing += 1;
      continue;
    }

    if (DRY_RUN) {
      console.log(`• ${key} (${bytes.length} B, ${row.mime}) → r2:${BUCKET}/${key}`);
      continue;
    }

    // 2. skip assets already in R2 (unless --force).
    if (!FORCE && r2ObjectExists(key)) {
      console.log(`= ${key} — already in R2, skipped (use --force to overwrite)`);
      skipped += 1;
      continue;
    }

    // 3. upload.
    const tmp = path.join(TMP_DIR, row.filename);
    writeFileSync(tmp, bytes);
    if (putToR2(key, tmp, row.mime)) {
      console.log(`✓ ${key} — uploaded (${bytes.length} B)`);
      uploaded += 1;
    } else {
      missing += 1;
    }
  }

  rmSync(TMP_DIR, { recursive: true, force: true });
  closeLocalDb();
  console.log(`\nDone: ${uploaded} uploaded, ${skipped} already present, ${missing} failed/missing.`);
  if (!DRY_RUN && uploaded > 0) {
    console.log("Production note: media URLs starting with /uploads/ now resolve through");
    console.log("the /api/v1/media route → R2. No D1 changes were made by this script.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
