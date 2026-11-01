-- 0004 — origin variants, per-variant imagery, durable media blobs.
--
-- 1. product_variants rebuild: adds the 'origin' type (selectable country of
--    manufacture) and image_media_id (per-variant photo — selecting a colour
--    or origin on the storefront swaps the gallery image). The CHECK on
--    `type` cannot be relaxed in place, so the standard SQLite rebuild is
--    used. Safe: no table references product_variants via FK (cart_items,
--    order_items and inventory store variant ids as plain TEXT).
-- 2. media_blobs: local-sandbox durability. public/uploads is scratch space
--    in the sandbox (files have been observed disappearing between sessions
--    while media_assets rows survive), which stranded product images as
--    "Image unavailable". Uploads now also persist their bytes here; the
--    public media route falls back to the blob (and re-materialises the
--    file) whenever the filesystem copy is missing.

CREATE TABLE product_variants_v4 (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('flavor','color','origin','capacity','nicotine')),
  swatch      TEXT,
  meta        TEXT,
  image_media_id TEXT,
  available   INTEGER NOT NULL DEFAULT 1,
  price_delta_cents INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0
);

INSERT INTO product_variants_v4
  (id, product_id, label, type, swatch, meta, image_media_id, available, price_delta_cents, position)
SELECT id, product_id, label, type, swatch, meta, NULL, available, price_delta_cents, position
FROM product_variants;

DROP TABLE product_variants;
ALTER TABLE product_variants_v4 RENAME TO product_variants;

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id, position);

-- Durable blob storage for uploaded assets (local sandbox parity of R2).
CREATE TABLE IF NOT EXISTS media_blobs (
  media_asset_id TEXT PRIMARY KEY REFERENCES media_assets(id) ON DELETE CASCADE,
  data BLOB NOT NULL
);
