-- 0003 — checkout idempotency integrity.
--
-- createOrder checked idempotency only BEFORE the write (check-then-act), so
-- two concurrent submits with the same Idempotency-Key could both create an
-- order (double COD order, double inventory reservation, two emails). The
-- partial unique index makes the second insert impossible at the storage
-- layer; createOrder catches the UNIQUE error and serves the stored replay.

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;
