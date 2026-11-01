-- TereaCOD — D1/local SQLite schema (baseline v1)
-- Portable: identical SQL runs on Cloudflare D1 and local node:sqlite.
-- Conventions: TEXT ULID-style prefixed ids, TEXT ISO-8601 UTC timestamps,
-- INTEGER money in fils (AED × 100), CHECK constraints instead of enums.

CREATE TABLE IF NOT EXISTS _migrations (
  name       TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- Local KV emulation (Workers uses the KV binding; this table is the fallback).
CREATE TABLE IF NOT EXISTS kv_store (
  key        TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Job outbox (Workers: drained by the Queue consumer; local: drained inline).
CREATE TABLE IF NOT EXISTS job_queue (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  error       TEXT,
  created_at  TEXT NOT NULL,
  processed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status, created_at);

CREATE TABLE IF NOT EXISTS counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

/* ============================== Identity ============================== */

CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  email_verified_at TEXT,
  password_hash     TEXT,
  display_name      TEXT NOT NULL,
  phone             TEXT,
  phone_verified_at TEXT,
  date_of_birth     TEXT,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  locale            TEXT NOT NULL DEFAULT 'en-AE',
  marketing_opt_in  INTEGER NOT NULL DEFAULT 0,
  last_login_at     TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_identities (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL CHECK (provider IN ('password','google','apple')),
  provider_user_id TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  ip           TEXT,
  user_agent   TEXT,
  device_label TEXT,
  created_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  revoked_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_addresses (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label         TEXT,
  full_name     TEXT NOT NULL,
  phone         TEXT NOT NULL,
  emirate       TEXT NOT NULL,
  city          TEXT NOT NULL,
  street        TEXT NOT NULL,
  building      TEXT,
  apartment     TEXT,
  note          TEXT,
  is_default_shipping INTEGER NOT NULL DEFAULT 0,
  is_default_billing  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language         TEXT NOT NULL DEFAULT 'en-AE',
  product_updates  INTEGER NOT NULL DEFAULT 1,
  order_updates    INTEGER NOT NULL DEFAULT 1,
  research_invites INTEGER NOT NULL DEFAULT 0,
  personalization  INTEGER NOT NULL DEFAULT 1,
  analytics        INTEGER NOT NULL DEFAULT 0,
  reduced_motion   INTEGER NOT NULL DEFAULT 0,
  updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS age_verifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  order_id    TEXT REFERENCES orders(id) ON DELETE SET NULL,
  method      TEXT NOT NULL CHECK (method IN ('self_declared','doorstep_emirates_id','vendor')),
  status      TEXT NOT NULL CHECK (status IN ('pending','verified','failed','expired')),
  verified_at TEXT,
  meta_json   TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  email        TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('access','deletion')),
  status       TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','in_progress','completed','rejected')),
  requested_at TEXT NOT NULL,
  completed_at TEXT,
  handled_by   TEXT,
  notes        TEXT
);

/* =============================== Catalog =============================== */

CREATE TABLE IF NOT EXISTS brands (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL UNIQUE,
  tagline       TEXT NOT NULL,
  blurb         TEXT NOT NULL,
  description   TEXT NOT NULL,
  origin        TEXT,
  established   TEXT,
  accent        TEXT NOT NULL DEFAULT 'violet' CHECK (accent IN ('violet','ice','magenta')),
  featured      INTEGER NOT NULL DEFAULT 0,
  logo_media_id TEXT,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  description      TEXT NOT NULL,
  long_description TEXT,
  image_media_id   TEXT,
  accent           TEXT NOT NULL DEFAULT 'violet' CHECK (accent IN ('violet','ice','magenta')),
  featured         INTEGER NOT NULL DEFAULT 0,
  position         INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  brand_id         TEXT NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
  category_id      TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  sku              TEXT NOT NULL UNIQUE,
  model            TEXT,
  tagline          TEXT NOT NULL,
  description      TEXT NOT NULL,
  price_cents      INTEGER NOT NULL CHECK (price_cents >= 0),
  compare_at_cents INTEGER CHECK (compare_at_cents IS NULL OR compare_at_cents >= price_cents),
  currency         TEXT NOT NULL DEFAULT 'AED',
  editorial_availability TEXT CHECK (editorial_availability IN ('unavailable')),
  low_stock_threshold    INTEGER NOT NULL DEFAULT 5,
  is_featured      INTEGER NOT NULL DEFAULT 0,
  is_new           INTEGER NOT NULL DEFAULT 0,
  nicotine_strength TEXT,
  age_restricted   INTEGER NOT NULL DEFAULT 1,
  origin           TEXT,
  compatibility_json TEXT,
  conformity_json  TEXT,                        -- JSON ConformityInfo[]
  warnings_json    TEXT,
  keywords         TEXT,
  published_at     TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  version          INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);

CREATE TABLE IF NOT EXISTS product_images (
  id             TEXT PRIMARY KEY,
  product_id     TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  alt            TEXT,
  position       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_product_images ON product_images(product_id, position);

CREATE TABLE IF NOT EXISTS product_variants (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('flavor','color','capacity','nicotine')),
  swatch      TEXT,
  meta        TEXT,
  available   INTEGER NOT NULL DEFAULT 1,
  price_delta_cents INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id, position);

CREATE TABLE IF NOT EXISTS product_spec_groups (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_spec_entries (
  id       TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES product_spec_groups(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  value    TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_spec_entries ON product_spec_entries(group_id, position);

CREATE TABLE IF NOT EXISTS product_documents (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('pdf','web')),
  href       TEXT,
  note       TEXT
);

CREATE TABLE IF NOT EXISTS product_faqs (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_related (
  product_id         TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position           INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, related_product_id)
);

CREATE TABLE IF NOT EXISTS inventory (
  product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id    TEXT NOT NULL DEFAULT '',
  qty_on_hand   INTEGER NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  qty_reserved  INTEGER NOT NULL DEFAULT 0 CHECK (qty_reserved >= 0),
  backorderable INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT NOT NULL,
  PRIMARY KEY (product_id, variant_id)
);

-- External-content FTS: repos write product_fts rows; triggers keep the index live.
CREATE TABLE IF NOT EXISTS product_fts (
  product_id TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  brand      TEXT NOT NULL,
  tagline    TEXT NOT NULL,
  description TEXT NOT NULL,
  keywords   TEXT
);
CREATE VIRTUAL TABLE IF NOT EXISTS product_fts_idx USING fts5(
  name, brand, tagline, description, keywords,
  content='product_fts', content_rowid='rowid',
  tokenize='porter unicode61'
);
CREATE TRIGGER IF NOT EXISTS product_fts_ai AFTER INSERT ON product_fts BEGIN
  INSERT INTO product_fts_idx(rowid, name, brand, tagline, description, keywords)
  VALUES (new.rowid, new.name, new.brand, new.tagline, new.description, new.keywords);
END;
CREATE TRIGGER IF NOT EXISTS product_fts_ad AFTER DELETE ON product_fts BEGIN
  INSERT INTO product_fts_idx(product_fts_idx, rowid, name, brand, tagline, description, keywords)
  VALUES ('delete', old.rowid, old.name, old.brand, old.tagline, old.description, old.keywords);
END;
CREATE TRIGGER IF NOT EXISTS product_fts_au AFTER UPDATE ON product_fts BEGIN
  INSERT INTO product_fts_idx(product_fts_idx, rowid, name, brand, tagline, description, keywords)
  VALUES ('delete', old.rowid, old.name, old.brand, old.tagline, old.description, old.keywords);
  INSERT INTO product_fts_idx(rowid, name, brand, tagline, description, keywords)
  VALUES (new.rowid, new.name, new.brand, new.tagline, new.description, new.keywords);
END;

/* =============================== Commerce =============================== */

CREATE TABLE IF NOT EXISTS carts (
  id              TEXT PRIMARY KEY,
  token           TEXT NOT NULL UNIQUE,
  user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  delivery_method TEXT CHECK (delivery_method IN ('standard','express')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','merged','converted','abandoned')),
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  expires_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id, status);

CREATE TABLE IF NOT EXISTS cart_items (
  id         TEXT PRIMARY KEY,
  cart_id    TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL DEFAULT '',
  qty        INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 99),
  created_at TEXT NOT NULL,
  UNIQUE (cart_id, product_id, variant_id)
);

CREATE TABLE IF NOT EXISTS saved_items (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  note       TEXT,
  saved_at   TEXT NOT NULL,
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id                 TEXT PRIMARY KEY,
  reference          TEXT NOT NULL UNIQUE,
  user_id            TEXT REFERENCES users(id) ON DELETE SET NULL,
  cart_id            TEXT REFERENCES carts(id) ON DELETE SET NULL,
  email              TEXT NOT NULL,
  phone              TEXT NOT NULL,
  full_name          TEXT NOT NULL,
  delivery_method    TEXT NOT NULL CHECK (delivery_method IN ('standard','express')),
  payment_method     TEXT NOT NULL CHECK (payment_method IN ('cash-on-delivery','card-on-delivery','saved-card','card')),
  payment_status     TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','authorized','paid','failed','refunded','cod_pending')),
  status             TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','confirmed','processing','packed','shipped','delivered','cancelled','returned')),
  subtotal_cents     INTEGER NOT NULL,
  delivery_fee_cents INTEGER NOT NULL,
  discount_cents     INTEGER NOT NULL DEFAULT 0,
  total_cents        INTEGER NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'AED',
  coupon_code        TEXT,
  customer_note      TEXT,
  idempotency_key    TEXT,
  ip                 TEXT,
  user_agent         TEXT,
  meta_json          TEXT,
  placed_at          TEXT NOT NULL,
  confirmed_at       TEXT,
  delivered_at       TEXT,
  cancelled_at       TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  version            INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, placed_at DESC);

CREATE TABLE IF NOT EXISTS order_addresses (
  id        TEXT PRIMARY KEY,
  order_id  TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type      TEXT NOT NULL CHECK (type IN ('shipping','billing')),
  full_name TEXT NOT NULL,
  phone     TEXT NOT NULL,
  emirate   TEXT NOT NULL,
  city      TEXT NOT NULL,
  street    TEXT NOT NULL,
  building  TEXT,
  apartment TEXT,
  note      TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id               TEXT PRIMARY KEY,
  order_id         TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       TEXT REFERENCES products(id) ON DELETE SET NULL,
  variant_id       TEXT,
  product_name     TEXT NOT NULL,
  variant_label    TEXT,
  brand_name       TEXT NOT NULL,
  sku              TEXT NOT NULL,
  image_url        TEXT,
  unit_price_cents INTEGER NOT NULL,
  qty              INTEGER NOT NULL CHECK (qty > 0),
  line_total_cents INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_events (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('status_change','payment','delivery','note','system')),
  from_status TEXT,
  to_status   TEXT,
  message     TEXT,
  actor       TEXT NOT NULL,
  at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_events ON order_events(order_id, at);

CREATE TABLE IF NOT EXISTS order_documents (
  id       TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  title    TEXT NOT NULL,
  type     TEXT NOT NULL CHECK (type IN ('pdf','web')),
  r2_key   TEXT,
  href     TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  provider     TEXT NOT NULL CHECK (provider IN ('cod','card_on_delivery','stripe')),
  provider_ref TEXT,
  amount_cents INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'AED',
  status       TEXT NOT NULL CHECK (status IN ('pending','authorized','captured','failed','refunded','partially_refunded','cod_pending')),
  event_json   TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refunds (
  id           TEXT PRIMARY KEY,
  payment_id   TEXT NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL,
  reason       TEXT,
  status       TEXT NOT NULL CHECK (status IN ('pending','completed','failed')),
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coupons (
  id                 TEXT PRIMARY KEY,
  code               TEXT NOT NULL UNIQUE,
  type               TEXT NOT NULL CHECK (type IN ('percent','fixed','free_delivery')),
  value              INTEGER NOT NULL,
  min_subtotal_cents INTEGER NOT NULL DEFAULT 0,
  starts_at          TEXT,
  ends_at            TEXT,
  usage_limit        INTEGER,
  per_user_limit     INTEGER,
  active             INTEGER NOT NULL DEFAULT 1,
  created_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id        TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id  TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id   TEXT,
  at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key           TEXT NOT NULL,
  endpoint      TEXT NOT NULL,
  request_hash  TEXT NOT NULL,
  response_json TEXT NOT NULL,
  status_code   INTEGER NOT NULL,
  created_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  PRIMARY KEY (key, endpoint)
);

/* ======================= Content, settings, media ======================= */

CREATE TABLE IF NOT EXISTS media_assets (
  id            TEXT PRIMARY KEY,
  filename      TEXT NOT NULL,
  folder        TEXT NOT NULL DEFAULT 'products',
  type          TEXT NOT NULL CHECK (type IN ('image','video','document')),
  mime          TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL DEFAULT 0,
  width         INTEGER,
  height        INTEGER,
  alt           TEXT,
  status        TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','processing','failed')),
  r2_key        TEXT NOT NULL,
  url           TEXT NOT NULL,
  variants_json TEXT,
  uploaded_by   TEXT,
  uploaded_at   TEXT NOT NULL,
  deleted_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_media_folder ON media_assets(folder) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_url ON media_assets(url);

CREATE TABLE IF NOT EXISTS settings_revisions (
  id         TEXT PRIMARY KEY,
  key        TEXT NOT NULL,
  revision   INTEGER NOT NULL,
  value_json TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE (key, revision)
);

CREATE TABLE IF NOT EXISTS navigation_items (
  id          TEXT PRIMARY KEY,
  location    TEXT NOT NULL CHECK (location IN ('header','footer-column-1','footer-column-2','footer-column-3','mobile','legal')),
  label       TEXT NOT NULL,
  href        TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  badge       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nav_location ON navigation_items(location, sort_order);

CREATE TABLE IF NOT EXISTS legal_documents (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  version        TEXT NOT NULL,
  effective_date TEXT NOT NULL,
  last_updated   TEXT NOT NULL,
  summary        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')),
  published_at   TEXT,
  updated_by     TEXT,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legal_sections (
  id          TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  heading     TEXT NOT NULL,
  body_json   TEXT NOT NULL,
  list_json   TEXT,
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS compliance_records (
  id            TEXT PRIMARY KEY,
  area          TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('verified','pending','missing','expired')),
  last_reviewed TEXT,
  expires_at    TEXT,
  owner         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS faqs (
  id         TEXT PRIMARY KEY,
  category   TEXT NOT NULL,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','replied','archived','converted')),
  ticket_id  TEXT,
  ip         TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','unsubscribed')),
  source       TEXT,
  confirmed_at TEXT,
  created_at   TEXT NOT NULL
);

/* ============================ Admin & support ============================ */

CREATE TABLE IF NOT EXISTS roles (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  is_system   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS permissions (
  slug        TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id         TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_slug TEXT NOT NULL REFERENCES permissions(slug) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_slug)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by TEXT,
  assigned_at TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS tickets (
  id             TEXT PRIMARY KEY,
  reference      TEXT NOT NULL UNIQUE,
  user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  subject        TEXT NOT NULL,
  category       TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved','closed')),
  priority       TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to    TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id           TEXT PRIMARY KEY,
  ticket_id    TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_type  TEXT NOT NULL CHECK (author_type IN ('customer','agent','system')),
  author_id    TEXT,
  author_label TEXT NOT NULL,
  body         TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_notes (
  id         TEXT PRIMARY KEY,
  ticket_id  TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id          TEXT PRIMARY KEY,
  at          TEXT NOT NULL,
  actor_type  TEXT NOT NULL CHECK (actor_type IN ('admin','system','customer')),
  actor_id    TEXT,
  actor_label TEXT NOT NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  detail      TEXT NOT NULL,
  before_json TEXT,
  after_json  TEXT,
  ip          TEXT,
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_events(at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_sev ON audit_events(severity, at DESC);
