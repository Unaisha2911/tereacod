-- 0008 — Product customer ratings (review-schema data source)
-- ------------------------------------------------------------------
-- Google Product rich results support aggregateRating — but the rating
-- MUST exist as real, visible on-page content (fabricated markup invites
-- a spam manual action). This table is the owner-curated rating store the
-- admin console edits; the storefront renders it (stars + count) and the
-- Product JSON-LD mirrors the exact same numbers.
--
-- Separate table on purpose:
--   • products rows stay untouched (no column migration on a live catalog);
--   • every read/write is wrapped so a pre-migration deployment degrades
--     to "unrated" instead of erroring storefront pages or admin saves.
--
-- Unrated products simply have no row here — valid schema.org either way.

CREATE TABLE IF NOT EXISTS product_ratings (
  product_id   TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  rating_value REAL    NOT NULL CHECK (rating_value >= 0.5 AND rating_value <= 5),
  rating_count INTEGER NOT NULL CHECK (rating_count >= 1),
  updated_at   TEXT    NOT NULL
);
