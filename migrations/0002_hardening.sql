-- 0002_hardening.sql — Enterprise QA audit (Task 26) hardening migration.
--
-- 1. Missing FK/hot indexes: SQLite does not auto-index foreign keys, so
--    every child-table lookup and CASCADE below scanned its parent table.
-- 2. Job lease column: drainJobs claims rows into 'processing'; crashed runs
--    left them stuck forever. leased_at powers the stale-lease requeue.
-- 3. Guest order lookup index.

-- Catalog children
CREATE INDEX IF NOT EXISTS idx_spec_groups_product ON product_spec_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_product_documents_product ON product_documents(product_id);
CREATE INDEX IF NOT EXISTS idx_product_faqs_product ON product_faqs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_related_related ON product_related(related_product_id);

-- Identity children
CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verify_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_identities_user ON auth_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_age_verifications_order ON age_verifications(order_id);
CREATE INDEX IF NOT EXISTS idx_age_verifications_user ON age_verifications(user_id);

-- Commerce children
CREATE INDEX IF NOT EXISTS idx_order_addresses_order ON order_addresses(order_id);
CREATE INDEX IF NOT EXISTS idx_order_documents_order ON order_documents(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_order ON coupon_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- Support children
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket ON ticket_notes(ticket_id);

-- Job queue lease for stale-'processing' requeue.
ALTER TABLE job_queue ADD COLUMN leased_at TEXT;
