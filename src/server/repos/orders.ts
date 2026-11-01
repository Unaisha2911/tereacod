/**
 * TereaCOD — orders repository: checkout, order records, state machine.
 *
 * Order creation is the transactional core:
 *  1. idempotency replay check (Idempotency-Key + endpoint)
 *  2. cart validation (non-empty, all lines purchasable, in stock)
 *  3. coupon evaluation (server-authoritative discounts + redemption limits)
 *  4. inventory reservation (conditional UPDATE per line, verified via changes())
 *  5. ONE all-or-nothing batch: order + address + events + items + payment
 *     + coupon redemption + cart conversion — a failure writes nothing
 *  6. confirmation email enqueued, audit written
 *
 * Reservations run just before the batch and are checked synchronously, so
 * oversell is rejected deterministically; the window between the last
 * reservation and the batch is milliseconds, and the catch path releases any
 * reserved units if the batch itself fails.
 *
 * References: VD-YYYYMMDD-NNNNNN via an atomic RETURNING counter increment.
 */

import { getDb, type BatchStatement } from "@/server/db/client";
import { newId } from "@/server/ids";
import { formatAED } from "@/lib/utils";
import { filsToAED, aedToFils } from "@/server/money";
import { getDeliveryConfig } from "@/server/repos/settings";
import { deliveryFeeFor, getRawLines, resolveLine, clearCart } from "@/server/repos/cart";
import { getProductsBySlugs } from "@/server/repos/catalog";
import { enqueue } from "@/server/jobs";
import { logAudit } from "@/server/audit";
import type {
  CartLineDetail,
  CatalogItem,
  DeliveryMethod,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  PaymentMethod,
  Paginated,
  TimelineEvent,
} from "@/types";

/* ------------------------------- references ------------------------------- */

export async function generateOrderReference(): Promise<string> {
  const db = await getDb();
  const now = new Date();
  const dateStamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  // Atomic increment+read in one statement — no interleaving race.
  const row = await db.get<{ value: number }>(
    `INSERT INTO counters (name, value) VALUES ('order_ref', 1)
     ON CONFLICT(name) DO UPDATE SET value = value + 1
     RETURNING value`
  );
  const seq = String(row?.value ?? 1).padStart(6, "0");
  return `VD-${dateStamp}-${seq}`;
}

/* ------------------------------ state machine ------------------------------ */

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/* ------------------------------- order types ------------------------------- */

export interface OrderRow {
  id: string;
  reference: string;
  user_id: string | null;
  email: string;
  phone: string;
  full_name: string;
  delivery_method: string;
  payment_method: string;
  payment_status: string;
  status: OrderStatus;
  subtotal_cents: number;
  delivery_fee_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  customer_note: string | null;
  placed_at: string;
}

export interface CreateOrderInput {
  contact: { fullName: string; email: string; phone: string };
  address: {
    emirate: string;
    city: string;
    street: string;
    building?: string;
    apartment?: string;
    note?: string;
  };
  deliveryMethod: DeliveryMethod;
  /** "card" is reserved for online Stripe payments; UI PaymentMethod covers COD flows. */
  paymentMethod: PaymentMethod | "card";
  /** Optional promo code — evaluated server-side or the order fails loudly. */
  couponCode?: string | null;
  cartId: string;
  userId?: string | null;
  idempotencyKey?: string | null;
  /** Fingerprint of the request body (cart-independent) for idempotency. */
  requestHash?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  declaredAge18Plus: boolean;
}

export type CreateOrderResult =
  | { ok: true; summary: OrderSummary; reference: string }
  | { ok: false; reason: "empty_cart" | "blocked_lines" | "out_of_stock"; detail?: string }
  | { ok: false; reason: "invalid_coupon"; detail?: string }
  | { ok: false; reason: "payment_unavailable" }
  | { ok: false; reason: "age_not_declared" };

/* ------------------------------ idempotency ------------------------------- */

async function replayIdempotent(
  key: string,
  requestHash: string
): Promise<OrderSummary | null> {
  const db = await getDb();
  const row = await db.get<{ response_json: string; request_hash: string }>(
    `SELECT response_json, request_hash FROM idempotency_keys WHERE key = ? AND endpoint = ?`,
    [key, "checkout.orders"]
  );
  if (!row) return null;
  if (row.request_hash !== requestHash) {
    // Same key, different payload — client bug; reject.
    return null;
  }
  try {
    return JSON.parse(row.response_json) as OrderSummary;
  } catch {
    return null;
  }
}

/** Public replay probe used by the route before cart resolution. */
export async function replayOrder(key: string, requestHash: string): Promise<OrderSummary | null> {
  return replayIdempotent(key, requestHash);
}

/** Stable request fingerprint over the order body (cart-independent). */
export async function orderRequestHash(body: unknown): Promise<string> {
  return sha(JSON.stringify(body));
}

async function storeIdempotent(key: string, requestHash: string, response: OrderSummary): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT OR IGNORE INTO idempotency_keys
      (key, endpoint, request_hash, response_json, status_code, created_at, expires_at)
     VALUES (?, 'checkout.orders', ?, ?, 201, ?, ?)`,
    [
      key,
      requestHash,
      JSON.stringify(response),
      new Date().toISOString(),
      new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    ]
  );
}

/* ------------------------------ order helpers ----------------------------- */

/** D1 caps one statement at 100 bound parameters — keep IN(...) lists at 90. */
const IN_CHUNK = 90;

function chunkIds(ids: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) out.push(ids.slice(i, i + IN_CHUNK));
  return out;
}

/** Available-to-promise per product (product-level inventory row, variant_id = ''). */
async function availabilityByProductIds(productIds: string[]): Promise<Map<string, number>> {
  const db = await getDb();
  const map = new Map<string, number>();
  for (const ids of chunkIds(productIds)) {
    const placeholders = ids.map(() => "?").join(",");
    const rows = await db.all<{ product_id: string; avail: number }>(
      `SELECT product_id, qty_on_hand - qty_reserved AS avail
       FROM inventory WHERE variant_id = '' AND product_id IN (${placeholders})`,
      ids
    );
    for (const row of rows) map.set(row.product_id, row.avail);
  }
  return map;
}

export interface CouponEvaluation {
  ok: boolean;
  couponId?: string;
  code?: string;
  /** percent/fixed coupons discount the order subtotal. */
  discountFils?: number;
  /** free_delivery coupons discount the delivery fee instead. */
  freeDelivery?: boolean;
  reason?: string;
}

/**
 * Server-authoritative coupon validation: active window, minimum spend, and
 * global + per-customer redemption limits. All math in fils.
 */
export async function evaluateCouponForOrder(args: {
  code: string;
  subtotalFils: number;
  userId: string | null;
  email: string;
}): Promise<CouponEvaluation> {
  const db = await getDb();
  const code = args.code.trim().toUpperCase();
  if (!code) return { ok: false, reason: "Enter a promo code." };

  const coupon = await db.get<{
    id: string;
    code: string;
    type: "percent" | "fixed" | "free_delivery";
    value: number;
    min_subtotal_cents: number;
    starts_at: string | null;
    ends_at: string | null;
    usage_limit: number | null;
    per_user_limit: number | null;
    active: number;
  }>(`SELECT * FROM coupons WHERE UPPER(code) = ?`, [code]);
  if (!coupon || coupon.active !== 1) {
    return { ok: false, reason: "This promo code is not valid." };
  }

  const nowIso = new Date().toISOString();
  if (coupon.starts_at && coupon.starts_at > nowIso) {
    return { ok: false, reason: "This promo code is not active yet." };
  }
  if (coupon.ends_at && coupon.ends_at < nowIso) {
    return { ok: false, reason: "This promo code has expired." };
  }
  if (args.subtotalFils < coupon.min_subtotal_cents) {
    return {
      ok: false,
      reason: `Spend ${formatAED(filsToAED(coupon.min_subtotal_cents))} or more to use this code.`,
    };
  }

  if (coupon.usage_limit !== null) {
    const row = await db.get<{ c: number }>(
      `SELECT COUNT(*) AS c FROM coupon_redemptions WHERE coupon_id = ?`,
      [coupon.id]
    );
    if ((row?.c ?? 0) >= coupon.usage_limit) {
      return { ok: false, reason: "This promo code has been fully redeemed." };
    }
  }

  if (coupon.per_user_limit !== null) {
    const row = args.userId
      ? await db.get<{ c: number }>(
          `SELECT COUNT(*) AS c FROM coupon_redemptions r
           JOIN orders o ON o.id = r.order_id
           WHERE r.coupon_id = ? AND o.user_id = ?`,
          [coupon.id, args.userId]
        )
      : await db.get<{ c: number }>(
          `SELECT COUNT(*) AS c FROM coupon_redemptions r
           JOIN orders o ON o.id = r.order_id
           WHERE r.coupon_id = ? AND o.email = ?`,
          [coupon.id, args.email]
        );
    if ((row?.c ?? 0) >= coupon.per_user_limit) {
      return { ok: false, reason: "You have already used this promo code." };
    }
  }

  if (coupon.type === "percent") {
    return {
      ok: true,
      couponId: coupon.id,
      code: coupon.code,
      discountFils: Math.floor((args.subtotalFils * coupon.value) / 100),
    };
  }
  if (coupon.type === "fixed") {
    return {
      ok: true,
      couponId: coupon.id,
      code: coupon.code,
      discountFils: Math.min(coupon.value, args.subtotalFils),
    };
  }
  return { ok: true, couponId: coupon.id, code: coupon.code, freeDelivery: true };
}

/** One aggregate pass for order lists — replaces the per-order N+1 queries. */
async function orderItemAggregates(
  orderIds: string[]
): Promise<Map<string, { count: number; preview: Array<{ name: string; quantity: number }> }>> {
  const map = new Map<string, { count: number; preview: Array<{ name: string; quantity: number }> }>();
  if (orderIds.length === 0) return map;
  const db = await getDb();
  for (let i = 0; i < orderIds.length; i += IN_CHUNK) {
    const ids = orderIds.slice(i, i + IN_CHUNK);
    const placeholders = ids.map(() => "?").join(",");
    const [counts, previews] = await Promise.all([
      db.all<{ order_id: string; c: number }>(
        `SELECT order_id, COALESCE(SUM(qty), 0) AS c FROM order_items
         WHERE order_id IN (${placeholders}) GROUP BY order_id`,
        ids
      ),
      db.all<{ order_id: string; product_name: string; variant_label: string | null; qty: number }>(
        `SELECT order_id, product_name, variant_label, qty FROM (
           SELECT order_id, product_name, variant_label, qty,
                  ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY rowid) AS rn
           FROM order_items WHERE order_id IN (${placeholders})
         ) WHERE rn <= 3`,
        ids
      ),
    ]);
    for (const id of ids) map.set(id, { count: 0, preview: [] });
    for (const row of counts) {
      const agg = map.get(row.order_id);
      if (agg) agg.count = row.c;
    }
    for (const row of previews) {
      const agg = map.get(row.order_id);
      if (agg) {
        agg.preview.push({
          name: row.variant_label ? `${row.product_name} — ${row.variant_label}` : row.product_name,
          quantity: row.qty,
        });
      }
    }
  }
  return map;
}

/* ------------------------------ create order ------------------------------ */

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const db = await getDb();

  if (!input.declaredAge18Plus) {
    return { ok: false, reason: "age_not_declared" };
  }

  // Idempotency replay (hash over the request body, not the cart).
  const requestHash = input.requestHash ?? (await sha(JSON.stringify(input)));
  if (input.idempotencyKey) {
    const replayed = await replayIdempotent(input.idempotencyKey, requestHash);
    if (replayed) return { ok: true, summary: replayed, reference: replayed.reference };
  }

  // Validate card payments availability (Stripe not configured → reject early).
  if (input.paymentMethod === "card" || input.paymentMethod === "saved-card") {
    const { STRIPE_SECRET_KEY } = await import("@/server/env");
    if (!STRIPE_SECRET_KEY) {
      return { ok: false, reason: "payment_unavailable" };
    }
  }

  const lines = await getRawLines(input.cartId);
  if (lines.length === 0) {
    return { ok: false, reason: "empty_cart" };
  }

  const products = await getProductsBySlugs(lines.map((l) => l.productSlug));
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const details: CartLineDetail[] = [];
  for (const line of lines) {
    const product = bySlug.get(line.productSlug);
    if (!product) continue;
    const detail = resolveLine(product, line);
    if (detail) details.push(detail);
  }

  if (details.length === 0) {
    return { ok: false, reason: "empty_cart" };
  }
  const blocked = details.filter((d) => d.blocked);
  if (blocked.length > 0) {
    return {
      ok: false,
      reason: "blocked_lines",
      detail: blocked.map((d) => `${d.product.name}: ${d.blockedReason ?? "unavailable"}`).join("; "),
    };
  }

  // Availability pre-check (chunked IN list — D1 caps bound params at 100).
  const availability = await availabilityByProductIds(details.map((d) => d.product.id));
  for (const d of details) {
    if ((availability.get(d.product.id) ?? 0) < d.qty) {
      return {
        ok: false,
        reason: "out_of_stock",
        detail: `${d.product.name} just sold out`,
      };
    }
  }

  // Totals (server-authoritative, fils). Unit price includes EVERY selected
  // variant's delta (colour AND origin both apply) — resolveLine computed it.
  const unitFils = (d: CartLineDetail) => Math.round(d.unitPrice * 100);
  const config = await getDeliveryConfig();
  const subtotalFils = details.reduce((sum, d) => sum + unitFils(d) * d.qty, 0);
  const deliveryFeeFils = deliveryFeeFor(subtotalFils, input.deliveryMethod, config);

  // Coupons are server-authoritative: an unrecognised or exhausted code fails
  // the order loudly instead of being silently ignored.
  let coupon: CouponEvaluation | null = null;
  let discountFils = 0;
  if (input.couponCode && input.couponCode.trim()) {
    const evaluation = await evaluateCouponForOrder({
      code: input.couponCode,
      subtotalFils,
      userId: input.userId ?? null,
      email: input.contact.email.trim().toLowerCase(),
    });
    if (!evaluation.ok) {
      return { ok: false, reason: "invalid_coupon", detail: evaluation.reason };
    }
    coupon = evaluation;
    discountFils = evaluation.freeDelivery
      ? deliveryFeeFils
      : Math.min(evaluation.discountFils ?? 0, subtotalFils);
  }

  const totalFils = Math.max(0, subtotalFils - discountFils + deliveryFeeFils);
  const itemCount = details.reduce((sum, d) => sum + d.qty, 0);

  // Reserve inventory — conditional updates; all-or-nothing.
  const reservations: Array<{ productId: string; qty: number }> = [];
  for (const d of details) {
    const productId = d.product.id;
    const result = await db.run(
      `UPDATE inventory SET qty_reserved = qty_reserved + ?, updated_at = ?
       WHERE product_id = ? AND variant_id = '' AND qty_on_hand - qty_reserved >= ?`,
      [d.qty, new Date().toISOString(), productId, d.qty]
    );
    if (result.changes !== 1) {
      // Roll back reservations made so far.
      for (const r of reservations) {
        await db.run(
          `UPDATE inventory SET qty_reserved = MAX(0, qty_reserved - ?), updated_at = ? WHERE product_id = ? AND variant_id = ''`,
          [r.qty, new Date().toISOString(), r.productId]
        );
      }
      return {
        ok: false,
        reason: "out_of_stock",
        detail: `${d.product.name} just sold out`,
      };
    }
    reservations.push({ productId, qty: d.qty });
  }

  // Persist everything in ONE all-or-nothing batch: order, address, events,
  // items, payment, coupon redemption, cart conversion.
  const now = new Date().toISOString();
  const orderId = newId("ord");
  const reference = await generateOrderReference();
  const status: OrderStatus = "processing"; // COD-first flow: straight to processing

  const statements: BatchStatement[] = [
    {
      sql: `INSERT INTO orders
              (id, reference, user_id, cart_id, email, phone, full_name,
               delivery_method, payment_method, payment_status, status,
               subtotal_cents, delivery_fee_cents, discount_cents, total_cents,
               currency, coupon_code, customer_note, idempotency_key, ip, user_agent,
               placed_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AED', ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        orderId,
        reference,
        input.userId ?? null,
        input.cartId,
        input.contact.email.trim().toLowerCase(),
        input.contact.phone,
        input.contact.fullName,
        input.deliveryMethod,
        input.paymentMethod,
        input.paymentMethod === "cash-on-delivery" || input.paymentMethod === "card-on-delivery"
          ? "cod_pending"
          : "pending",
        status,
        subtotalFils,
        deliveryFeeFils,
        discountFils,
        totalFils,
        coupon?.code ?? null,
        input.address.note ?? null,
        input.idempotencyKey ?? null,
        input.ip ?? null,
        input.userAgent ?? null,
        now,
        now,
        now,
      ],
    },
    {
      sql: `INSERT INTO order_addresses
              (id, order_id, type, full_name, phone, emirate, city, street, building, apartment, note)
            VALUES (?, ?, 'shipping', ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        newId("oad"),
        orderId,
        input.contact.fullName,
        input.contact.phone,
        input.address.emirate,
        input.address.city,
        input.address.street,
        input.address.building ?? null,
        input.address.apartment ?? null,
        input.address.note ?? null,
      ],
    },
    {
      sql: `INSERT INTO order_events (id, order_id, type, from_status, to_status, message, actor, at)
            VALUES (?, ?, 'status_change', 'placed', ?, 'Order received', 'system', ?)`,
      params: [newId("oev"), orderId, status, now],
    },
    {
      sql: `INSERT INTO order_events (id, order_id, type, to_status, message, actor, at)
            VALUES (?, ?, 'delivery', NULL, ?, 'system', ?)`,
      params: [
        newId("oev"),
        orderId,
        `Courier to ${input.address.city}, ${input.address.emirate} — Emirates ID verified at the door`,
        now,
      ],
    },
  ];

  try {
    // Coupon redemption + event (usage counting = redemption rows).
    if (coupon) {
      statements.push({
        sql: `INSERT INTO coupon_redemptions (id, coupon_id, order_id, user_id, at)
              VALUES (?, ?, ?, ?, ?)`,
        params: [newId("crd"), coupon.couponId ?? "", orderId, input.userId ?? null, now],
      });
      statements.push({
        sql: `INSERT INTO order_events (id, order_id, type, to_status, message, actor, at)
              VALUES (?, ?, 'system', NULL, ?, 'system', ?)`,
        params: [
          newId("oev"),
          orderId,
          `Promo code ${coupon.code} applied — ${formatAED(filsToAED(discountFils))} off`,
          now,
        ],
      });
    }

    for (const d of details) {
      const product = d.product;
      statements.push({
        sql: `INSERT INTO order_items
          (id, order_id, product_id, variant_id, product_name, variant_label, brand_name, sku,
           image_url, unit_price_cents, qty, line_total_cents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          newId("oit"),
          orderId,
          product.id,
          d.variants.length > 0 ? d.variants.map((v) => v.id).join("|") : null,
          product.name,
          d.variantLabel ?? null,
          product.brand,
          product.sku,
          product.images[0] ?? null,
          unitFils(d),
          d.qty,
          unitFils(d) * d.qty,
        ],
      });
    }

    // Payment record (COD / mPOS only — card intents run through Stripe later).
    if (input.paymentMethod === "cash-on-delivery" || input.paymentMethod === "card-on-delivery") {
      statements.push({
        sql: `INSERT INTO payments (id, order_id, provider, amount_cents, currency, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'AED', 'cod_pending', ?, ?)`,
        params: [
          newId("pay"),
          orderId,
          input.paymentMethod === "cash-on-delivery" ? "cod" : "card_on_delivery",
          totalFils,
          now,
          now,
        ],
      });
    }

    // Convert the cart.
    statements.push({ sql: `UPDATE carts SET status = 'converted', updated_at = ? WHERE id = ?`, params: [now, input.cartId] });
    statements.push({ sql: `DELETE FROM cart_items WHERE cart_id = ?`, params: [input.cartId] });

    try {
      await db.batch(statements);
    } catch (error) {
      // Concurrent duplicate submit: the partial unique index on
      // orders(idempotency_key) (migration 0003) rejects the second insert —
      // serve the stored replay instead of failing the customer.
      const msg = error instanceof Error ? error.message : String(error);
      if (input.idempotencyKey && /UNIQUE/i.test(msg)) {
        const replayed = await replayIdempotent(input.idempotencyKey, requestHash);
        if (replayed) return { ok: true, summary: replayed, reference: replayed.reference };
      }
      throw error;
    }
  } catch (error) {
    // Release reservations — the batch failed, so nothing was written.
    for (const r of reservations) {
      await db.run(
        `UPDATE inventory SET qty_reserved = MAX(0, qty_reserved - ?), updated_at = ? WHERE product_id = ? AND variant_id = ''`,
        [r.qty, new Date().toISOString(), r.productId]
      ).catch(() => undefined);
    }
    throw error;
  }

  const summary: OrderSummary = {
    reference,
    placedAt: now,
    status,
    itemCount,
    itemsPreview: details.slice(0, 3).map((d) => ({
      name: d.variantLabel ? `${d.product.name} — ${d.variantLabel}` : d.product.name,
      quantity: d.qty,
    })),
    totalLabel: formatAED(filsToAED(totalFils)),
    fulfilmentLabel: buildFulfilmentLabel(input.deliveryMethod),
  };

  if (input.idempotencyKey) {
    await storeIdempotent(input.idempotencyKey, requestHash, summary);
  }

  // Confirmation email (recorded in the job outbox).
  await enqueue("email.send", {
    to: input.contact.email,
    subject: `TereaCOD order ${reference} confirmed`,
    text: [
      `Thank you for your TereaCOD order ${reference}.`,
      ``,
      ...details.map((d) => `• ${d.qty}× ${d.product.name}${d.variantLabel ? ` — ${d.variantLabel}` : ""}`),
      ``,
      `Total: ${summary.totalLabel}`,
      buildFulfilmentLabel(input.deliveryMethod),
      ``,
      `Our courier verifies age (18+) with your Emirates ID at the door.`,
    ].join("\n"),
  });

  await logAudit({
    actorType: "customer",
    actorId: input.userId ?? null,
    actorLabel: input.contact.fullName,
    action: "order.create",
    targetType: "order",
    targetId: reference,
    detail: `Order placed — ${itemCount} items, total ${summary.totalLabel} (${input.paymentMethod})`,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return { ok: true, summary, reference };
}

async function sha(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildFulfilmentLabel(method: DeliveryMethod): string {
  return method === "express"
    ? "Express delivery · Arrives next day"
    : "Standard delivery · Arrives in 2–4 days";
}

/* ------------------------------ order mapping ------------------------------ */

function shortStamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-AE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Dubai",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

function paymentLabel(method: string): string {
  switch (method) {
    case "cash-on-delivery":
      return "Cash on delivery";
    case "card-on-delivery":
      return "Card on delivery (machine brought to you)";
    case "card":
      return "Card payment (online)";
    case "saved-card":
      return "Saved card (online)";
    default:
      return method;
  }
}

function timelineFromEvents(
  status: OrderStatus,
  placedAt: string,
  events: Array<{ type: string; to_status: string | null; message: string | null; at: string }>
): TimelineEvent[] {
  const statusAt = new Map<string, string>();
  for (const e of events) {
    if (e.to_status && !statusAt.has(e.to_status)) statusAt.set(e.to_status, e.at);
  }
  const flow: Array<{ id: string; label: string; status: OrderStatus }> = [
    { id: "t1", label: "Order placed", status: "placed" },
    { id: "t2", label: "Age & payment verification", status: "confirmed" },
    { id: "t3", label: "Packed", status: "packed" },
    { id: "t4", label: "Handed to courier", status: "shipped" },
    { id: "t5", label: "Delivered — ID checked at door", status: "delivered" },
  ];
  const reached = new Set<OrderStatus>();
  const orderFlow: OrderStatus[] = ["placed", "confirmed", "processing", "packed", "shipped", "delivered"];
  const currentIndex = orderFlow.indexOf(status);
  for (const s of orderFlow.slice(0, currentIndex + 1)) reached.add(s);
  if (status === "cancelled") {
    return [
      {
        id: "t1",
        label: "Order cancelled",
        at: shortStamp(statusAt.get("cancelled") ?? placedAt),
        completed: true,
      },
    ];
  }
  return flow.map((step, index) => ({
    id: step.id,
    label: step.label,
    at: reached.has(step.status)
      ? shortStamp(statusAt.get(step.status) ?? placedAt)
      : index === 1
        ? "At the door"
        : "Pending",
    completed: reached.has(step.status),
    note: index === 1 && !reached.has(step.status) ? "Emirates ID checked by the courier on delivery." : undefined,
  }));
}

export async function getOrderDetailRow(reference: string): Promise<{
  order: OrderRow;
  items: Array<{
    id: string;
    product_name: string;
    variant_label: string | null;
    brand_name: string;
    qty: number;
    line_total_cents: number;
    image_url: string | null;
  }>;
  events: Array<{ type: string; to_status: string | null; message: string | null; at: string }>;
  address: {
    full_name: string;
    phone: string;
    emirate: string;
    city: string;
    street: string;
    building: string | null;
    apartment: string | null;
  } | null;
} | null> {
  const db = await getDb();
  const order = await db.get<OrderRow & { customer_note: string | null }>(
    `SELECT * FROM orders WHERE reference = ?`,
    [reference]
  );
  if (!order) return null;
  const [items, events, address] = await Promise.all([
    db.all<{
      id: string;
      product_name: string;
      variant_label: string | null;
      brand_name: string;
      qty: number;
      line_total_cents: number;
      image_url: string | null;
    }>(`SELECT id, product_name, variant_label, brand_name, qty, line_total_cents, image_url
        FROM order_items WHERE order_id = ? ORDER BY rowid`, [order.id]),
    db.all<{ type: string; to_status: string | null; message: string | null; at: string }>(
      `SELECT type, to_status, message, at FROM order_events WHERE order_id = ? ORDER BY at`,
      [order.id]
    ),
    db.get<{
      full_name: string;
      phone: string;
      emirate: string;
      city: string;
      street: string;
      building: string | null;
      apartment: string | null;
    }>(
      `SELECT full_name, phone, emirate, city, street, building, apartment
       FROM order_addresses WHERE order_id = ? AND type = 'shipping'`,
      [order.id]
    ),
  ]);
  return { order, items, events, address };
}

export function mapOrderDetail(
  data: NonNullable<Awaited<ReturnType<typeof getOrderDetailRow>>>
): OrderDetail {
  const { order, items, events, address } = data;
  const addressEcho = address ? `${address.city}, ${address.emirate}` : "your address";
  return {
    reference: order.reference,
    placedAt: order.placed_at,
    status: order.status,
    timeline: timelineFromEvents(order.status, order.placed_at, events),
    items: items.map((item) => ({
      name: item.product_name,
      brand: item.brand_name,
      quantity: item.qty,
      variantLabel: item.variant_label ?? undefined,
      lineTotalLabel: formatAED(filsToAED(item.line_total_cents)),
      image: item.image_url ?? undefined,
    })),
    statusHistory: events
      .filter((e) => e.type === "status_change" && e.to_status)
      .map((e) => ({
        status: e.to_status as OrderStatus,
        at: shortStamp(e.at),
        note: e.message ?? undefined,
      })),
    supportHref: "/contact",
    documents: [{ id: `${order.reference}-receipt`, title: "Delivery receipt", type: "pdf" }],
    deliveryLabel: `Courier to ${addressEcho} — ID verification on delivery`,
    paymentLabel: paymentLabel(order.payment_method),
    totalLabel: formatAED(filsToAED(order.total_cents)),
    // Customer identity + shipping address — consumed by the admin console;
    // on customer-facing copies these echo the customer's own order data.
    customer: {
      name: order.full_name,
      email: order.email,
      isGuest: order.user_id === null,
    },
    shippingAddress: address
      ? {
          fullName: address.full_name,
          phone: address.phone,
          emirate: address.emirate,
          city: address.city,
          street: address.street,
          building: address.building,
          apartment: address.apartment,
        }
      : undefined,
  };
}

export function mapOrderSummary(order: OrderRow, itemCount: number, preview: Array<{ name: string; quantity: number }>): OrderSummary {
  return {
    reference: order.reference,
    placedAt: order.placed_at,
    status: order.status,
    itemCount,
    itemsPreview: preview,
    totalLabel: formatAED(filsToAED(order.total_cents)),
    fulfilmentLabel: buildFulfilmentLabel(order.delivery_method as DeliveryMethod),
  };
}

/* --------------------------------- queries -------------------------------- */

export async function listOrdersForUser(
  userId: string,
  query: { status?: string; page?: number; pageSize?: number } = {}
): Promise<Paginated<OrderSummary>> {
  const db = await getDb();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, query.pageSize ?? 10));
  const where: string[] = [`user_id = ?`];
  const params: unknown[] = [userId];
  if (query.status && query.status !== "all") {
    where.push(`status = ?`);
    params.push(query.status);
  }
  const whereSql = where.join(" AND ");

  const [totalRow, rows] = await Promise.all([
    db.get<{ c: number }>(`SELECT COUNT(*) AS c FROM orders WHERE ${whereSql}`, params),
    db.all<OrderRow>(
      `SELECT * FROM orders WHERE ${whereSql} ORDER BY placed_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    ),
  ]);
  const total = totalRow?.c ?? 0;

  // One aggregate pass instead of two queries per order (N+1).
  const aggregates = await orderItemAggregates(rows.map((r) => r.id));
  const summaries = rows.map((order) => {
    const agg = aggregates.get(order.id) ?? { count: 0, preview: [] };
    return mapOrderSummary(order, agg.count, agg.preview);
  });

  return { items: summaries, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function getOrderSummaryForUser(
  userId: string,
  reference: string
): Promise<OrderSummary | null> {
  const db = await getDb();
  const order = await db.get<OrderRow>(`SELECT * FROM orders WHERE reference = ? AND user_id = ?`, [
    reference,
    userId,
  ]);
  if (!order) return null;
  const itemCountRow = await db.get<{ c: number }>(
    `SELECT COALESCE(SUM(qty), 0) AS c FROM order_items WHERE order_id = ?`,
    [order.id]
  );
  const preview = await db.all<{ product_name: string; variant_label: string | null; qty: number }>(
    `SELECT product_name, variant_label, qty FROM order_items WHERE order_id = ? LIMIT 3`,
    [order.id]
  );
  return mapOrderSummary(
    order,
    itemCountRow?.c ?? 0,
    preview.map((p) => ({
      name: p.variant_label ? `${p.product_name} — ${p.variant_label}` : p.product_name,
      quantity: p.qty,
    }))
  );
}

/* ------------------------------- admin ops -------------------------------- */

export async function adminListOrders(query: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<OrderSummary>> {
  const db = await getDb();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, query.pageSize ?? 10));
  const where: string[] = [`1 = 1`];
  const params: unknown[] = [];
  if (query.status && query.status !== "all") {
    where.push(`status = ?`);
    params.push(query.status);
  }
  if (query.search) {
    where.push(`(reference LIKE ? OR email LIKE ? OR full_name LIKE ?)`);
    const like = `%${query.search}%`;
    params.push(like, like, like);
  }
  const whereSql = where.join(" AND ");
  const [totalRow, rows] = await Promise.all([
    db.get<{ c: number }>(`SELECT COUNT(*) AS c FROM orders WHERE ${whereSql}`, params),
    db.all<OrderRow>(
      `SELECT * FROM orders WHERE ${whereSql} ORDER BY placed_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    ),
  ]);

  const total = totalRow?.c ?? 0;
  // One aggregate pass instead of two queries per order (N+1).
  const aggregates = await orderItemAggregates(rows.map((r) => r.id));
  const summaries = rows.map((order) => {
    const agg = aggregates.get(order.id) ?? { count: 0, preview: [] };
    return mapOrderSummary(order, agg.count, agg.preview);
  });
  return { items: summaries, total, page, pageSize, hasMore: page * pageSize < total };
}

export type TransitionResult =
  | { ok: true; status: OrderStatus }
  | { ok: false; reason: "not_found" | "illegal_transition" };

/** Apply an order state transition (admin operations). */
export async function transitionOrder(
  reference: string,
  toStatus: OrderStatus,
  actor: { id?: string | null; label: string },
  note?: string
): Promise<TransitionResult> {
  const db = await getDb();
  const order = await db.get<OrderRow & { version: number }>(
    `SELECT * FROM orders WHERE reference = ?`,
    [reference]
  );
  if (!order) return { ok: false, reason: "not_found" };
  if (!canTransition(order.status, toStatus)) {
    return { ok: false, reason: "illegal_transition" };
  }

  const now = new Date().toISOString();

  // Optimistic concurrency: only transition from the observed status/version —
  // two racing admins cannot both apply the same hop.
  const update = await db.run(
    `UPDATE orders SET status = ?, updated_at = ?, version = version + 1
      ${toStatus === "delivered" ? ", delivered_at = ?" : ""}
      ${toStatus === "cancelled" ? ", cancelled_at = ?" : ""}
      WHERE id = ? AND status = ? AND version = ?`,
    [
      toStatus,
      now,
      ...(toStatus === "delivered" ? [now] : []),
      ...(toStatus === "cancelled" ? [now] : []),
      order.id,
      order.status,
      order.version,
    ]
  );
  if (update.changes !== 1) {
    // Another actor transitioned the order first; this hop is no longer legal.
    return { ok: false, reason: "illegal_transition" };
  }

  const items = await db.all<{ product_id: string | null; qty: number }>(
    `SELECT product_id, qty FROM order_items WHERE order_id = ?`,
    [order.id]
  );

  const statements: BatchStatement[] = [
    {
      sql: `INSERT INTO order_events (id, order_id, type, from_status, to_status, message, actor, at)
     VALUES (?, ?, 'status_change', ?, ?, ?, ?, ?)`,
      params: [
        newId("oev"),
        order.id,
        order.status,
        toStatus,
        note ?? `Status updated to ${toStatus}`,
        actor.id ? `admin:${actor.id}` : actor.label,
        now,
      ],
    },
  ];

  if (toStatus === "delivered") {
    statements.push({
      sql: `INSERT INTO age_verifications (id, order_id, method, status, verified_at, created_at)
       VALUES (?, ?, 'doorstep_emirates_id', 'verified', ?, ?)`,
      params: [newId("age"), order.id, now, now],
    });
    // COD settles on delivery: the courier collected, and the reservation
    // converts into a definitive stock reduction.
    if (order.payment_method === "cash-on-delivery" || order.payment_method === "card-on-delivery") {
      statements.push({ sql: `UPDATE orders SET payment_status = 'paid' WHERE id = ?`, params: [order.id] });
      statements.push({
        sql: `UPDATE payments SET status = 'captured', updated_at = ? WHERE order_id = ? AND status = 'cod_pending'`,
        params: [now, order.id],
      });
    }
    for (const item of items) {
      if (item.product_id) {
        statements.push({
          sql: `UPDATE inventory
                SET qty_on_hand = MAX(0, qty_on_hand - ?), qty_reserved = MAX(0, qty_reserved - ?), updated_at = ?
                WHERE product_id = ? AND variant_id = ''`,
          params: [item.qty, item.qty, now, item.product_id],
        });
      }
    }
  }

  if (toStatus === "cancelled") {
    // Release reservations. COD orders keep payment_status 'cod_pending' —
    // no money moved, so 'refunded' would be false (enum extension requires a
    // table-rebuild migration; documented in docs/QA-AUDIT.md).
    for (const item of items) {
      if (item.product_id) {
        statements.push({
          sql: `UPDATE inventory SET qty_reserved = MAX(0, qty_reserved - ?), updated_at = ? WHERE product_id = ? AND variant_id = ''`,
          params: [item.qty, now, item.product_id],
        });
      }
    }
  }

  try {
    await db.batch(statements);
  } catch (error) {
    // The status CAS (db.run) already committed — if the event/inventory
    // batch fails, roll the status back so the hop can be retried instead of
    // leaving an order "delivered"/"cancelled" with no event and unsettled
    // stock.
    await db.run(
      `UPDATE orders SET status = ?, updated_at = ?, version = version - 1,
         delivered_at = NULL, cancelled_at = NULL
       WHERE id = ? AND status = ? AND version = ?`,
      [order.status, now, order.id, toStatus, order.version + 1]
    ).catch(() => undefined);
    throw error;
  }

  await logAudit({
    actorType: "admin",
    actorId: actor.id ?? null,
    actorLabel: actor.label,
    action: "order.status",
    targetType: "order",
    targetId: reference,
    detail: `${order.status} → ${toStatus}${note ? ` — ${note}` : ""}`,
    before: { status: order.status },
    after: { status: toStatus },
  });

  await enqueue("order.status_notify", { reference, to: order.email, status: toStatus });
  return { ok: true, status: toStatus };
}

/** Admin order counts by status for dashboards. */

/** Admin order detail bundle: summary + full detail for the console pages. */
export async function adminOrderDetailBundle(
  reference: string
): Promise<{ summary: OrderSummary; detail: OrderDetail } | null> {
  const row = await getOrderDetailRow(reference);
  if (!row) return null;
  const itemCount = row.items.reduce((sum, item) => sum + item.qty, 0);
  const summary: OrderSummary = {
    reference: row.order.reference,
    placedAt: row.order.placed_at,
    status: row.order.status,
    itemCount,
    itemsPreview: row.items.slice(0, 3).map((item) => ({
      name: item.variant_label ? `${item.product_name} — ${item.variant_label}` : item.product_name,
      quantity: item.qty,
    })),
    totalLabel: formatAED(filsToAED(row.order.total_cents)),
    fulfilmentLabel: buildFulfilmentLabel(row.order.delivery_method as DeliveryMethod),
  };
  return { summary, detail: mapOrderDetail(row) };
}
