/**
 * TereaCOD — THE single database seed script.
 *
 * ONE database (db/tereacod.db) · ONE seed file. Prepares a fresh
 * deployment (e.g. the tereacod.ae production push) with everything the
 * site needs EXCEPT the catalog — products, brands and categories are
 * authored in the admin console after go-live, so they are deliberately
 * NOT seeded:
 *
 *   • settings (site copy, delivery config, feature flags)   — text content
 *   • navigation (header / mobile / footer / legal strip)    — text content
 *   • legal documents + sections                             — text content
 *   • compliance records                                     — text content
 *   • FAQs                                                   — text content
 *   • RBAC (permissions + roles) + the single admin login    — admin access
 *   • brand/logo media rows + logo/favicon/og asset check    — logos
 *
 * Not seeded (removed from the former mega-seed): products, brands,
 * categories, coupons, demo customers, demo orders, demo support
 * tickets, audit history. Re-running is SAFE on a live store — it only
 * converges the sections above and never deletes catalog, order or
 * media rows created at runtime, and it never touches an existing
 * admin password (rotate deliberately with
 * `ADMIN_PASSWORD=… bun run db:seed`).
 *
 * Usage:
 *   bun scripts/seed.ts           # idempotent upsert
 *   bun scripts/seed.ts --reset   # drop the local DB file first
 *
 * Push to a fresh remote database (Cloudflare D1):
 *   bun run db:migrate:remote     # schema migrations first
 *   bun run db:seed:export && bun run db:seed:remote && bun run db:seed:kv:remote
 */

import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { getLocalDb, closeLocalDb } from "../src/server/db/local";
import { newId } from "../src/server/ids";
import { hashPassword, unusablePasswordHash } from "../src/server/password";
import { ROLE_SEED, PERMISSION_SLUGS } from "../src/server/rbac";

import { SITE_SETTINGS } from "../src/data/site-settings";
import { NAVIGATION_ITEMS } from "../src/data/navigation";
import { LEGAL_DOCUMENTS } from "../src/data/legal";
import { COMPLIANCE_RECORDS } from "../src/data/compliance";
import { FAQS } from "../src/app/(site)/help/faq/faqs";

const RESET = process.argv.includes("--reset");
const DB_FILE = path.join(process.cwd(), "db", "tereacod.db");

if (RESET && existsSync(DB_FILE)) {
  // Drop the WAL/SHM companions too — leftover journal files from the
  // removed database would corrupt the freshly created one.
  for (const file of [DB_FILE, `${DB_FILE}-wal`, `${DB_FILE}-shm`]) {
    if (existsSync(file)) unlinkSync(file);
  }
  console.log("• removed existing database (incl. -wal/-shm)");
}

/* ----------------------------------------------------------------------------
 * Brand assets ("logos") — merged from the former brand-assets.mjs.
 *
 * The logo set ships with the repo in /public: logo.svg is the source of
 * truth; favicon.ico (multi-size) and og-image.jpg (1200×630 social card)
 * are derived from it. They are committed, so this step is normally a
 * no-op verification — but on a machine where they are missing it
 * regenerates them best-effort, keeping a single command able to bootstrap
 * a fresh deployment.
 * -------------------------------------------------------------------------- */

const PUBLIC_DIR = path.join(process.cwd(), "public");
const LOGO_SVG = path.join(PUBLIC_DIR, "logo.svg");

console.log("• brand assets (logos)");
for (const file of ["logo.svg", "favicon.ico", "og-image.jpg", "apple-touch-icon.png", "icon-192.png", "icon-512.png"]) {
  const status = existsSync(path.join(PUBLIC_DIR, file)) ? "✓" : "✗ missing";
  console.log(`  ${status} public/${file}`);
}

async function ensureDerivedBrandAssets(): Promise<void> {
  if (!existsSync(LOGO_SVG)) {
    console.log("  ! public/logo.svg not found — skip favicon/og regeneration");
    return;
  }

  // 1. favicon.ico — multi-size ICO (16/32/48/64) rendered from logo.svg.
  if (!existsSync(path.join(PUBLIC_DIR, "favicon.ico"))) {
    try {
      const sharp = (await import("sharp")).default;
      const { execSync } = await import("node:child_process");
      const { writeFileSync } = await import("node:fs");
      const tmpPng = "/tmp/terea-favicon-256.png";
      const png = await sharp(LOGO_SVG, { density: 600 }).resize(256, 256).png().toBuffer();
      writeFileSync(tmpPng, png);
      execSync(
        `python3 - <<'PY'
from PIL import Image
img = Image.open("${tmpPng}").convert("RGBA")
img.save("${path.join(PUBLIC_DIR, "favicon.ico")}", sizes=[(16,16),(32,32),(48,48),(64,64)])
print("favicon.ico written")
PY`,
        { stdio: "inherit" }
      );
    } catch (error) {
      console.log(`  ! favicon.ico regeneration failed (${(error as Error).message}) — commit it instead`);
    }
  }

  // 2. og-image.jpg — 1200×630 branded OpenGraph card (tile + wordmark + tagline).
  if (!existsSync(path.join(PUBLIC_DIR, "og-image.jpg"))) {
    try {
      const sharp = (await import("sharp")).default;
      const { readFileSync } = await import("node:fs");
      const logoSvg = readFileSync(LOGO_SVG, "utf8");
      const tileSvg = logoSvg.replace(
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">',
        '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 64 64" fill="none">'
      );
      const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="grad" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
      <stop stop-color="#a78bfa"/><stop offset="0.55" stop-color="#8b5cf6"/><stop offset="1" stop-color="#6fd6f2"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="460" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#8b5cf6"/><stop offset="1" stop-color="#6fd6f2"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="34%" r="75%">
      <stop stop-color="#8b5cf6" stop-opacity="0.20"/><stop offset="1" stop-color="#060409" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#060409"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(536,72)">${tileSvg}</g>
  <text x="600" y="330" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="96" letter-spacing="14" fill="#F4F2FF">TereaCOD</text>
  <rect x="370" y="362" width="460" height="5" rx="2.5" fill="url(#bar)"/>
  <text x="600" y="432" text-anchor="middle" font-family="DejaVu Sans" font-size="33" letter-spacing="6" fill="#B9B3C9">TEREA DELIVERY UAE · CASH &amp; CARD ON DELIVERY</text>
  <text x="600" y="488" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="30" letter-spacing="4" fill="#6FD6F2">tereacod.ae</text>
  <text x="600" y="574" text-anchor="middle" font-family="DejaVu Sans" font-size="20" letter-spacing="3" fill="#8B84A0">ADULTS 18+ ONLY (UAE) · AGE-VERIFIED AT THE DOOR</text>
</svg>`;
      await sharp(Buffer.from(og)).jpeg({ quality: 92 }).toFile(path.join(PUBLIC_DIR, "og-image.jpg"));
      console.log("  ✓ public/og-image.jpg regenerated (1200x630)");
    } catch (error) {
      console.log(`  ! og-image.jpg regeneration failed (${(error as Error).message}) — commit it instead`);
    }
  }
}

await ensureDerivedBrandAssets();

/* --------------------------------- open db --------------------------------- */

const db = (await getLocalDb()).raw();
const now = new Date().toISOString();

function upsert(table: string, key: string, row: Record<string, unknown>): void {
  const keys = Object.keys(row);
  const cols = keys.join(", ");
  const placeholders = keys.map(() => "?").join(", ");
  const updates = keys
    .filter((k) => k !== key)
    .map((k) => `${k} = excluded.${k}`)
    .join(", ");
  db.prepare(
    `INSERT INTO ${table} (${cols}) VALUES (${placeholders})
     ON CONFLICT(${key}) DO UPDATE SET ${updates}`
  ).run(...Object.values(row));
}

/* --------------------------------- settings -------------------------------- */

console.log("• settings (site copy, delivery config, feature flags)");
const kv = db.prepare(
  `INSERT INTO kv_store (key, value_json, updated_at) VALUES (?, ?, ?)
   ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
);
kv.run("settings:site", JSON.stringify(SITE_SETTINGS), now);
kv.run(
  "settings:delivery",
  JSON.stringify({ freeThresholdFils: 30000, standardFeeFils: 2500, expressFeeFils: 3500 }),
  now
);
kv.run("settings:features", JSON.stringify({ maintenance: false, checkoutEnabled: true }), now);

/* -------------------------------- navigation ------------------------------- */

console.log("• navigation (header / mobile / footer / legal)");
for (const item of NAVIGATION_ITEMS) {
  const existing = db.prepare(`SELECT id FROM navigation_items WHERE id = ?`).get(item.id) as
    | { id: string }
    | undefined;
  const id = existing?.id ?? item.id;
  upsert("navigation_items", "id", {
    id,
    location: item.location,
    label: item.label,
    href: item.href,
    description: item.description ?? null,
    icon: item.icon ?? null,
    badge: item.badge ?? null,
    sort_order: item.sortOrder,
    enabled: item.enabled ? 1 : 0,
    updated_at: now,
  });
}

/* ----------------------------- legal documents ----------------------------- */

console.log(`• legal documents (${LEGAL_DOCUMENTS.length})`);
for (const doc of LEGAL_DOCUMENTS) {
  const existing = db.prepare(`SELECT id FROM legal_documents WHERE slug = ?`).get(doc.slug) as
    | { id: string }
    | undefined;
  const id = existing?.id ?? newId("leg");
  upsert("legal_documents", "slug", {
    id,
    slug: doc.slug,
    title: doc.title,
    version: doc.version,
    effective_date: doc.effectiveDate,
    last_updated: doc.lastUpdated,
    summary: doc.summary,
    status: "published",
    published_at: now,
    updated_at: now,
  });
  db.prepare(`DELETE FROM legal_sections WHERE document_id = ?`).run(id);
  doc.sections.forEach((section, position) => {
    db.prepare(
      `INSERT INTO legal_sections (id, document_id, heading, body_json, list_json, position)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      newId("lgs"),
      id,
      section.heading,
      JSON.stringify(section.paragraphs),
      section.list ? JSON.stringify(section.list) : null,
      position
    );
  });
}

/* ----------------------------- compliance records -------------------------- */

console.log(`• compliance records (${COMPLIANCE_RECORDS.length})`);
for (const record of COMPLIANCE_RECORDS) {
  const existing = db.prepare(`SELECT id FROM compliance_records WHERE id = ?`).get(record.id) as
    | { id: string }
    | undefined;
  upsert("compliance_records", "id", {
    id: existing?.id ?? record.id,
    area: record.area,
    title: record.title,
    description: record.description,
    status: record.status,
    last_reviewed: record.lastReviewed ?? null,
    expires_at: record.expiresAt ?? null,
    owner: record.owner ?? null,
    created_at: now,
    updated_at: now,
  });
}

/* ----------------------------------- FAQs ---------------------------------- */

console.log(`• faqs (${FAQS.length})`);
db.prepare(`DELETE FROM faqs`).run();
FAQS.forEach((faq, index) => {
  db.prepare(
    `INSERT INTO faqs (id, category, question, answer, position, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(faq.id, faq.category, faq.question, faq.answer, index, now);
});

/* ------------------------------- RBAC + admin ------------------------------ */

console.log("• roles & permissions");
for (const slug of PERMISSION_SLUGS) {
  db.prepare(
    `INSERT INTO permissions (slug, description) VALUES (?, ?)
     ON CONFLICT(slug) DO UPDATE SET description = excluded.description`
  ).run(slug, slug.replace(".", " — "));
}
for (const role of ROLE_SEED) {
  const existing = db.prepare(`SELECT id FROM roles WHERE slug = ?`).get(role.slug) as
    | { id: string }
    | undefined;
  const id = existing?.id ?? newId("rol");
  upsert("roles", "slug", {
    id,
    slug: role.slug,
    name: role.name,
    description: role.description,
    is_system: 1,
  });
  db.prepare(`DELETE FROM role_permissions WHERE role_id = ?`).run(id);
  const permissions = role.permissions === "*" ? [...PERMISSION_SLUGS] : role.permissions;
  for (const permission of permissions) {
    db.prepare(
      `INSERT OR IGNORE INTO role_permissions (role_id, permission_slug) VALUES (?, ?)`
    ).run(id, permission);
  }
}

console.log("• admin login (the only seeded user)");

/**
 * Password policy (deliberate):
 *   • fresh user      → created with ADMIN_PASSWORD env ?? documented default;
 *   • existing user   → hash left UNTOUCHED unless ADMIN_PASSWORD is set,
 *     which is the explicit rotation path. A plain re-run on a live store
 *     must never silently reset a password the admin has since changed.
 */
const adminPasswordExplicit = process.env.ADMIN_PASSWORD;
async function ensureUser(input: {
  email: string;
  displayName: string;
  password?: string;
  roleSlugs?: string[];
  status?: string;
  phone?: string;
  rotatePassword?: boolean;
}): Promise<string> {
  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(input.email) as
    | { id: string }
    | undefined;
  let userId = existing?.id;
  if (!userId) {
    userId = newId("usr");
    const passwordHash = input.password
      ? await hashPassword(input.password)
      : await unusablePasswordHash();
    // Seeded users are operator-provisioned: their email is vouched for by
    // the deployment, so it is marked verified immediately — accounts are
    // active with no verification step.
    db.prepare(
      `INSERT INTO users (id, email, password_hash, display_name, phone, status, locale, email_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'en-AE', ?, ?, ?)`
    ).run(userId, input.email, passwordHash, input.displayName, input.phone ?? null, input.status ?? "active", now, now, now);
    db.prepare(`INSERT INTO user_preferences (user_id, updated_at) VALUES (?, ?)`).run(userId, now);
    console.log(`  + created ${input.email}`);
  } else if (input.password && input.rotatePassword) {
    const passwordHash = await hashPassword(input.password);
    db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`).run(
      passwordHash,
      now,
      userId
    );
    console.log(`  ~ password rotated for ${input.email} (ADMIN_PASSWORD set)`);
  } else {
    console.log(`  = ${input.email} already exists — password left untouched`);
  }
  // Backfill verification for users seeded before verification was automatic.
  db.prepare(`UPDATE users SET email_verified_at = ? WHERE id = ? AND email_verified_at IS NULL`).run(now, userId);
  for (const slug of input.roleSlugs ?? []) {
    const role = db.prepare(`SELECT id FROM roles WHERE slug = ?`).get(slug) as { id: string } | undefined;
    if (role) {
      db.prepare(
        `INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at) VALUES (?, ?, ?)`
      ).run(userId, role.id, now);
    }
  }
  return userId;
}

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@tereacod.ae";
const adminExisted = Boolean(
  db.prepare(`SELECT id FROM users WHERE email = ?`).get(adminEmail)
);
await ensureUser({
  email: adminEmail,
  displayName: "TereaCOD Admin",
  password: adminPasswordExplicit ?? "Admin#TereaCOD2025",
  roleSlugs: ["super-admin"],
  rotatePassword: Boolean(adminPasswordExplicit),
});

/* ------------------------------ logo media rows ----------------------------- */

/**
 * Brand imagery the storefront references as static files
 * (/brand/*.jpg on the homepage brand story + brand landing page).
 * Seeding the media_assets rows keeps them visible in the admin media
 * library on a fresh database. Product imagery is NOT seeded — it is
 * uploaded through the admin after go-live.
 */
console.log("• logo & brand media rows");
const BRAND_MEDIA = [
  {
    name: "atelier.jpg",
    folder: "brand",
    type: "image",
    url: "/brand/atelier.jpg",
    alt: "Inside the TereaCOD shop, abstract",
    width: 1600,
    height: 1000,
    sizeLabel: "264 KB",
  },
  {
    name: "craft.jpg",
    folder: "brand",
    type: "image",
    url: "/brand/craft.jpg",
    alt: "Brand-wall photography, abstract",
    width: 1600,
    height: 1000,
    sizeLabel: "248 KB",
  },
] as const;

for (const asset of BRAND_MEDIA) {
  upsert("media_assets", "url", {
    id: newId("med"),
    filename: asset.name,
    folder: asset.folder,
    type: asset.type,
    mime: "image/jpeg",
    size_bytes: asset.sizeLabel.includes("MB")
      ? Math.round(parseFloat(asset.sizeLabel) * 1024 * 1024)
      : Math.round(parseFloat(asset.sizeLabel) * 1024),
    width: asset.width,
    height: asset.height,
    alt: asset.alt,
    status: "ready",
    r2_key: asset.url,
    url: asset.url,
    uploaded_at: now,
  });
}

/* ---------------------------------- done ----------------------------------- */

const count = (table: string): number =>
  (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;

console.log("");
console.log("✓ seed complete:", {
  settings: 3,
  navigation: count("navigation_items"),
  legal: count("legal_documents"),
  compliance: count("compliance_records"),
  faqs: count("faqs"),
  roles: count("roles"),
  permissions: count("permissions"),
  users: count("users"),
  media: count("media_assets"),
});
console.log(
  `  catalog left to the admin console — products: ${count("products")}, brands: ${count("brands")}, categories: ${count("categories")}`
);
console.log(
  `  admin sign-in: ${adminEmail} / ${
    adminPasswordExplicit
      ? "<ADMIN_PASSWORD value>"
      : adminExisted
        ? "<unchanged — set ADMIN_PASSWORD to rotate>"
        : "Admin#TereaCOD2025"
  }`
);

closeLocalDb();
