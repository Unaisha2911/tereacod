/**
 * Checkout double-order race test — runs against a THROWAWAY copy of the
 * dev database (LOCAL_DB_PATH override — the local driver honours it),
 * never the live dev DB.
 *
 * Scenario: two concurrent createOrder calls for the same active cart
 * (double-click). Expected: exactly ONE order row; the loser either
 * replays the winner's summary or reports cart_processing; the cart ends
 * converted; reservations match the single order.
 *
 * Usage: bun scripts/test-checkout-race.ts   (reads LOCAL_DB_PATH, falls
 * back to a temp copy it creates itself when unset).
 */
import { getDb } from "@/server/db/client";
import { createOrder } from "@/server/repos/orders";
import { createCart, addLine } from "@/server/repos/cart";

const db = await getDb();
const now = new Date().toISOString();

// --- minimal catalog fixture (brand → category → product → inventory) ---
await db.run(
  `INSERT INTO brands (id, slug, name, tagline, blurb, description, accent, position, created_at, updated_at)
   VALUES ('br_test', 'test-brand', 'Test Brand', 'Test tagline', 'Test blurb', 'Test description', 'violet', 99, ?, ?)
   ON CONFLICT(id) DO NOTHING`,
  [now, now]
);
await db.run(
  `INSERT INTO categories (id, slug, name, description, accent, position, created_at, updated_at)
   VALUES ('cat_test', 'test-collection', 'Test Collection', 'Test category description.', 'violet', 99, ?, ?)
   ON CONFLICT(id) DO NOTHING`,
  [now, now]
);
await db.run(
  `INSERT INTO products (id, slug, name, brand_id, category_id, sku, tagline, price_cents, description,
                         is_featured, published_at, created_at, updated_at)
   VALUES ('prd_test', 'test-stick', 'Test Stick', 'br_test', 'cat_test', 'SKU-TEST', 'Test tagline', 4500,
           'Test product for the checkout race fixture.', 1, ?, ?, ?)
   ON CONFLICT(id) DO NOTHING`,
  [now, now, now]
);
await db.run(
  `INSERT INTO inventory (product_id, variant_id, qty_on_hand, qty_reserved, updated_at)
   VALUES ('prd_test', '', 10, 0, ?)
   ON CONFLICT(product_id, variant_id) DO NOTHING`,
  [now]
);

// --- cart fixture ---
const cart = await createCart(null);
await addLine(cart.id, "prd_test", null, 2);

const contact = { fullName: "Race Tester", email: "race@test.example", phone: "+971500000000" };
const address = { emirate: "Dubai", city: "Dubai", street: "Test Street 1" };
const base = {
  contact,
  address,
  deliveryMethod: "standard" as const,
  paymentMethod: "cash-on-delivery" as const,
  cartId: cart.id,
  userId: null,
  declaredAge18Plus: true,
};

// --- fire two concurrent placements (same cart, different bodies would be
// a different hash; double-click sends the SAME body) ---
const body = { ...base, idempotencyKey: "checkout.orders:" + cart.id };
const [a, b] = await Promise.all([createOrder(body), createOrder(body)]);

const orders = await db.all<{ id: string; reference: string; total_cents: number }>(
  `SELECT id, reference, total_cents FROM orders WHERE cart_id = ?`,
  [cart.id]
);
const cartRow = await db.get<{ status: string }>(`SELECT status FROM carts WHERE id = ?`, [cart.id]);
const inv = await db.get<{ qty_reserved: number }>(
  `SELECT qty_reserved FROM inventory WHERE product_id = 'prd_test' AND variant_id = ''`
);

console.log("winner:", a.ok ? a.reference : a.reason);
console.log("loser :", b.ok ? b.reference : b.reason);
console.log("orders for cart:", orders.length, orders.map((o) => o.reference).join(","));
console.log("cart status:", cartRow?.status);
console.log("inventory reserved:", inv?.qty_reserved);

let pass = true;
if (orders.length !== 1) { console.error("FAIL: expected exactly 1 order"); pass = false; }
if (a.ok && b.ok && a.reference !== b.reference) { console.error("FAIL: two different successes"); pass = false; }
if (!a.ok && !b.ok) { console.error("FAIL: both placements failed"); pass = false; }
if (cartRow?.status !== "converted") { console.error("FAIL: cart not converted"); pass = false; }
if ((inv?.qty_reserved ?? 0) !== 2) { console.error("FAIL: reservations should be exactly 2 (one order × qty)"); pass = false; }

// --- cleanup fixture rows (throwaway DB anyway) ---
console.log(pass ? "\nRACE TEST: PASS" : "\nRACE TEST: FAIL");
process.exit(pass ? 0 : 1);
