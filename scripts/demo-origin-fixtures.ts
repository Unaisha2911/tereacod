/**
 * LOCAL-ONLY demo fixtures for the multi-origin card popup + ?origin=
 * deep link (card "See all origins" → product page with that origin
 * preselected). Insert three demo products:
 *
 *   demo-multi-origin  — Japan / Italy / Switzerland (Duty Free) variants
 *   demo-two-origin    — Uzbekistan / Tajikistan variants
 *   demo-single-origin — product-level Italy origin, no variants
 *
 * Idempotent (INSERT OR IGNORE). Remove with:
 *   sqlite3 db/tereacod.db "DELETE FROM product_variants WHERE product_id LIKE 'prod_demo_%';
 *                            DELETE FROM product_images WHERE product_id LIKE 'prod_demo_%';
 *                            DELETE FROM inventory WHERE product_id LIKE 'prod_demo_%';
 *                            DELETE FROM product_fts WHERE product_id LIKE 'prod_demo_%';
 *                            DELETE FROM products WHERE id LIKE 'prod_demo_%';
 *                            DELETE FROM media_assets WHERE id LIKE 'med_demo_%';
 *                            DELETE FROM brands WHERE id = 'brand_demo_terea';"
 *
 * Production (Cloudflare D1) is never touched — this file is a dev tool.
 */
import { getLocalDb } from "../src/server/db/local";

async function main() {
  const db = await getLocalDb();
  const now = new Date().toISOString();
  const BRAND_ID = "brand_demo_terea";
  const MEDIA = [
    { id: "med_demo_img1", url: "/products/aura-700.jpg", alt: "Demo TEREA pack on stone", mime: "image/jpeg" },
    { id: "med_demo_img2", url: "/products/dune-pro-2500.jpg", alt: "Demo TEREA sticks lineup", mime: "image/jpeg" },
  ];

  const statements: Array<{ sql: string; params?: unknown[] }> = [
    {
      sql: `INSERT OR IGNORE INTO brands (id, slug, name, tagline, blurb, description, origin, established, accent, featured, logo_media_id, position, created_at, updated_at)
            VALUES (?, 'terea-demo', 'TEREA Demo', 'Demo brand for origin popup verification', 'Demo brand blurb.', 'Demo brand description.', 'Japan', '2021', 'violet', 1, NULL, 0, ?, ?)`,
      params: [BRAND_ID, now, now],
    },
    ...MEDIA.map((m) => ({
      sql: `INSERT OR IGNORE INTO media_assets (id, filename, folder, type, mime, size_bytes, width, height, alt, status, r2_key, url, variants_json, uploaded_by, uploaded_at, deleted_at)
            VALUES (?, ?, 'demo', 'image', ?, 100000, 1200, 900, ?, 'ready', ?, ?, '{}', 'seed', ?, NULL)`,
      params: [m.id, m.url.split("/").pop(), m.mime, m.alt, `demo/${m.url.split("/").pop()}`, m.url, now],
    })),
  ];

  const products = [
    {
      id: "prod_demo_multi",
      slug: "demo-multi-origin",
      name: "TEREA Purple Wave",
      sku: "DEMO-MULTI-01",
      origin: "Japan",
      media: "med_demo_img1",
      tagline: "Japan and Italy sourcing lines in one listing — popup picker demo.",
      description:
        "Demo listing carrying three origin variants (Japan, Italy and the Swiss duty-free line) so the card shows the See all origins trigger and the product page opens preselected via ?origin=.",
      featured: 1,
      isNew: 1,
    },
    {
      id: "prod_demo_single",
      slug: "demo-single-origin",
      name: "TEREA Silver",
      sku: "DEMO-SINGLE-01",
      origin: "Italy",
      media: "med_demo_img2",
      tagline: "Single sourcing line — plain origin chip, no picker.",
      description: "Demo listing with only a product-level Italy origin and no origin variants.",
      featured: 0,
      isNew: 0,
    },
    {
      id: "prod_demo_two",
      slug: "demo-two-origin",
      name: "TEREA Amber",
      sku: "DEMO-TWO-01",
      origin: "Uzbekistan",
      media: "med_demo_img1",
      tagline: "Two sourcing lines — compact popup demo.",
      description: "Demo listing with Uzbekistan and Tajikistan origin variants.",
      featured: 0,
      isNew: 0,
    },
  ];

  const variantRows: Array<{ product: string; key: string; label: string; delta: number; position: number }> = [
    { product: "prod_demo_multi", key: "japan", label: "Japan", delta: 300, position: 0 },
    { product: "prod_demo_multi", key: "italy", label: "Italy", delta: 200, position: 1 },
    { product: "prod_demo_multi", key: "swiss", label: "Switzerland (Duty Free)", delta: 0, position: 2 },
    { product: "prod_demo_two", key: "uzbekistan", label: "Uzbekistan", delta: 0, position: 0 },
    { product: "prod_demo_two", key: "tajikistan", label: "Tajikistan", delta: 100, position: 1 },
  ];

  for (const p of products) {
    statements.push({
      sql: `INSERT OR IGNORE INTO products (id, slug, name, brand_id, category_id, sku, model, tagline, description, price_cents, compare_at_cents, currency, editorial_availability, low_stock_threshold, is_featured, is_new, nicotine_strength, age_restricted, origin, compatibility_json, conformity_json, warnings_json, keywords, published_at, created_at, updated_at, version)
            VALUES (?, ?, ?, ?, 'cat_store_terea_sticks', ?, NULL, ?, ?, 5000, 5500, 'AED', NULL, 5, ?, ?, '0.5 mg', 1, ?, '{}', '{}', '[]', 'demo', ?, ?, ?, 1)`,
      params: [p.id, p.slug, p.name, BRAND_ID, p.sku, p.tagline, p.description, p.featured, p.isNew, p.origin, now, now, now],
    });
    statements.push({
      sql: `INSERT OR IGNORE INTO product_fts (product_id, name, brand, tagline, description, keywords)
            VALUES (?, ?, 'TEREA Demo', ?, ?, 'demo')`,
      params: [p.id, p.name, p.tagline, p.description],
    });
    statements.push({
      sql: `INSERT OR IGNORE INTO product_images (id, product_id, media_asset_id, alt, position)
            VALUES (?, ?, ?, 'Demo image', 0)`,
      params: [`pi_${p.id}`, p.id, p.media],
    });
    statements.push({
      sql: `INSERT OR IGNORE INTO inventory (product_id, variant_id, qty_on_hand, qty_reserved, backorderable, updated_at)
            VALUES (?, '', 40, 0, 0, ?)`,
      params: [p.id, now],
    });
  }

  for (const v of variantRows) {
    statements.push({
      sql: `INSERT OR IGNORE INTO product_variants (id, product_id, label, type, swatch, meta, image_media_id, available, price_delta_cents, position)
            VALUES (?, ?, ?, 'origin', NULL, NULL, NULL, 1, ?, ?)`,
      params: [`pv_${v.product}_${v.key}`, v.product, v.label, v.delta, v.position],
    });
  }

  await db.batch(statements);
  console.log(`demo fixtures inserted: ${products.length} products, ${variantRows.length} origin variants`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("fixture insert failed:", err);
    process.exit(1);
  });
