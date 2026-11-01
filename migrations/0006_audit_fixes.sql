-- 0006_audit_fixes — indexes + redemption integrity from the comprehensive audit.
--
-- 1. payments.provider_ref: the Stripe webhook looks a payment up by
--    provider_ref on every event; without an index that is a full table
--    scan on a table that grows with orders.
-- 2. coupon_redemptions: one redemption row per (order, coupon) — the
--    UNIQUE index is a hard backstop against double-redemption rows for
--    the same order (idempotent replays, retried batches).
-- 3. carts.checkout_claimed_at: checkout claim marker for the double-order
--    race. The first placement claims the cart (NULL → timestamp); a
--    concurrent placement sees the claim, polls for the idempotency replay
--    and never builds a second order. The maintenance sweep releases
--    claims older than 15 minutes (crash between claim and batch).

CREATE INDEX IF NOT EXISTS idx_payments_provider_ref
  ON payments(provider_ref) WHERE provider_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_redemptions_order_coupon
  ON coupon_redemptions(order_id, coupon_id);

ALTER TABLE carts ADD COLUMN checkout_claimed_at TEXT;
