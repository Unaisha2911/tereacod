/**
 * TereaCOD — cart repository. The server cart is the single source of truth
 * for pricing and availability; the client store is presentational.
 *
 * Carts are identified by an opaque token in a signed cookie (guests) and
 * attached to the user id once signed in (merge on sign-in).
 */

import { getDb } from "@/server/db/client";
import { newId } from "@/server/ids";
import { getDeliveryConfig } from "@/server/repos/settings";
import { filsToAED } from "@/server/money";
import { getProductsBySlugs } from "@/server/repos/catalog";
import {
  combinedVariantLabel,
  splitVariantIds,
  variantPriceDeltaTotal,
} from "@/lib/variant-selection";
import type { CartDetail, CartLine, CartLineDetail, CartTotals, CatalogItem, DeliveryMethod, ItemVariant } from "@/types";

const MAX_QTY = 99;

export interface DeliveryMethodInfo {
  label: string;
  fee: number;
  eta: string;
}

export function deliveryFeeFor(subtotalFils: number, method: DeliveryMethod, config: { freeThresholdFils: number; standardFeeFils: number; expressFeeFils: number }): number {
  if (method === "express") return config.expressFeeFils;
  return subtotalFils >= config.freeThresholdFils ? 0 : config.standardFeeFils;
}

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, DeliveryMethodInfo> = {
  standard: { label: "Standard delivery", fee: 25, eta: "1-hour delivery in Dubai · same-day UAE-wide" },
  express: { label: "Express delivery", fee: 35, eta: "Arrives next day" },
};

/* ------------------------------ cart lifecycle ---------------------------- */

export interface CartRow {
  id: string;
  token: string;
  user_id: string | null;
  status: string;
}

export async function findCartByToken(token: string): Promise<CartRow | null> {
  const db = await getDb();
  return db.get<CartRow>(
    `SELECT id, token, user_id, status FROM carts WHERE token = ? AND status = 'active'`,
    [token]
  );
}

export async function findActiveCartForUser(userId: string): Promise<CartRow | null> {
  const db = await getDb();
  return db.get<CartRow>(
    `SELECT id, token, user_id, status FROM carts
     WHERE user_id = ? AND status = 'active'
     ORDER BY updated_at DESC LIMIT 1`,
    [userId]
  );
}

export async function createCart(userId?: string | null): Promise<CartRow> {
  const db = await getDb();
  const now = new Date().toISOString();
  const row: CartRow = {
    id: newId("cart"),
    token: newId("crt"),
    user_id: userId ?? null,
    status: "active",
  };
  await db.run(
    `INSERT INTO carts (id, token, user_id, status, created_at, updated_at, expires_at)
     VALUES (?, ?, ?, 'active', ?, ?, ?)`,
    [row.id, row.token, row.user_id, now, now, new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()]
  );
  return row;
}

/** Get the active cart for a token, or null. */
export async function getActiveCart(token: string | null, userId: string | null): Promise<CartRow | null> {
  if (token) {
    const byToken = await findCartByToken(token);
    // Never resolve a token cart that belongs to a DIFFERENT user (stale
    // cookie after sign-out would otherwise leak another account's cart).
    if (byToken && (!byToken.user_id || byToken.user_id === userId)) return byToken;
  }
  if (userId) {
    return findActiveCartForUser(userId);
  }
  return null;
}

/**
 * Most recent converted cart for this guest token / user. Used by the
 * checkout route to probe idempotency replay after a dropped response —
 * the cart is already converted, but the client never saw the 201.
 */
export async function findLatestConvertedCart(token: string | null, userId: string | null): Promise<CartRow | null> {
  const db = await getDb();
  if (token) {
    const byToken = await db.get<CartRow>(
      `SELECT id, token, user_id, status FROM carts
       WHERE token = ? AND status = 'converted' AND (user_id IS NULL OR user_id = ?)
       ORDER BY updated_at DESC LIMIT 1`,
      [token, userId]
    );
    if (byToken) return byToken;
  }
  if (userId) {
    return db.get<CartRow>(
      `SELECT id, token, user_id, status FROM carts
       WHERE user_id = ? AND status = 'converted'
       ORDER BY updated_at DESC LIMIT 1`,
      [userId]
    );
  }
  return null;
}

export async function touchCart(cartId: string): Promise<void> {
  const now = new Date().toISOString();
  // Sliding expiry: an actively-used cart must not be swept at its original
  // 30-day created_at deadline.
  await (await getDb()).run(
    `UPDATE carts SET updated_at = ?, expires_at = ? WHERE id = ?`,
    [now, new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(), cartId]
  );
}

/* --------------------------------- lines ---------------------------------- */

export async function getRawLines(cartId: string): Promise<CartLine[]> {
  const db = await getDb();
  const rows = await db.all<{ product_slug: string; variant_id: string; qty: number }>(
    `SELECT p.slug AS product_slug, ci.variant_id, ci.qty
     FROM cart_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = ? ORDER BY ci.created_at`,
    [cartId]
  );
  return rows.map((row) => ({
    productSlug: row.product_slug,
    variantId: row.variant_id === "" ? null : row.variant_id,
    qty: row.qty,
  }));
}

export async function addLine(
  cartId: string,
  productId: string,
  variantId: string | null,
  qty: number
): Promise<void> {
  const db = await getDb();
  const safeQty = Math.min(MAX_QTY, Math.max(1, Math.round(qty)));
  // UPSERT: rapid double-adds (two POSTs before either resolves) must merge
  // instead of colliding on UNIQUE(cart_id, product_id, variant_id).
  await db.run(
    `INSERT INTO cart_items (id, cart_id, product_id, variant_id, qty, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(cart_id, product_id, variant_id)
     DO UPDATE SET qty = MIN(99, qty + excluded.qty)`,
    [newId("ci"), cartId, productId, variantId ?? "", safeQty, new Date().toISOString()]
  );
  await touchCart(cartId);
}

export async function setLineQty(
  cartId: string,
  productId: string,
  variantId: string | null,
  qty: number
): Promise<void> {
  const db = await getDb();
  if (qty < 1) {
    await removeLine(cartId, productId, variantId);
    return;
  }
  await db.run(
    `UPDATE cart_items SET qty = ? WHERE cart_id = ? AND product_id = ? AND variant_id = ?`,
    [Math.min(MAX_QTY, Math.round(qty)), cartId, productId, variantId ?? ""]
  );
  await touchCart(cartId);
}

export async function removeLine(
  cartId: string,
  productId: string,
  variantId: string | null
): Promise<void> {
  const db = await getDb();
  await db.run(
    `DELETE FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id = ?`,
    [cartId, productId, variantId ?? ""]
  );
  await touchCart(cartId);
}

export async function clearCart(cartId: string): Promise<void> {
  const db = await getDb();
  await db.run(`DELETE FROM cart_items WHERE cart_id = ?`, [cartId]);
  await touchCart(cartId);
}

/* ------------------------------ cart resolution ---------------------------- */

const isProductBlocked = (availability: CatalogItem["availability"]): boolean =>
  availability === "out_of_stock" || availability === "unavailable";

export function resolveLine(
  product: CatalogItem,
  line: CartLine
): CartLineDetail | null {
  // A line stores ALL selected option ids joined with "|" (colour + origin
  // can be picked together). Legacy single-id lines parse identically.
  const storedIds = splitVariantIds(line.variantId);
  const variants = storedIds.map(
    (id) => product.variants.find((v) => v.id === id) ?? null
  );

  let blocked = isProductBlocked(product.availability);
  let blockedReason = blocked
    ? product.availability === "out_of_stock"
      ? "Out of stock"
      : "Currently unavailable"
    : undefined;

  if (!blocked && storedIds.length > 0) {
    const hasMissing = variants.some((v, i) => v === null && storedIds[i] !== "");
    if (hasMissing) {
      blocked = true;
      blockedReason = "Option no longer offered";
    }
  }
  if (!blocked) {
    const unavailable = variants.find((v) => v !== null && !v.available);
    if (unavailable) {
      blocked = true;
      blockedReason = unavailable.meta ?? "Currently unavailable";
    }
  }

  const resolved = variants.filter((v): v is ItemVariant => v !== null);
  // Every selected option's delta is part of the authoritative price —
  // colour AND origin deltas both apply.
  const unitPrice = product.price + variantPriceDeltaTotal(resolved);
  return {
    key: `${product.slug}:${line.variantId ?? "-"}`,
    product,
    variants: resolved,
    variantLabel: combinedVariantLabel(resolved),
    qty: line.qty,
    unitPrice,
    lineTotal: unitPrice * line.qty,
    blocked,
    blockedReason,
  };
}

export async function buildCartDetail(lines: CartLine[]): Promise<CartDetail> {
  const products = await getProductsBySlugs(lines.map((l) => l.productSlug));
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const resolved: CartLineDetail[] = [];
  for (const line of lines) {
    const product = bySlug.get(line.productSlug);
    if (!product) continue; // stale lines are dropped silently
    const detail = resolveLine(product, line);
    if (detail) resolved.push(detail);
  }

  const config = await getDeliveryConfig();
  const purchasableFils = resolved
    .filter((line) => !line.blocked)
    .reduce((sum, line) => sum + Math.round(line.lineTotal * 100), 0);
  const totals: CartTotals = {
    subtotal: filsToAED(purchasableFils),
    deliveryFee: filsToAED(deliveryFeeFor(purchasableFils, "standard", config)),
    total: filsToAED(purchasableFils + deliveryFeeFor(purchasableFils, "standard", config)),
    itemCount: resolved.filter((l) => !l.blocked).reduce((sum, l) => sum + l.qty, 0),
  };

  return {
    lines: resolved,
    totals,
    hasBlocked: resolved.some((line) => line.blocked),
  };
}

export async function getCartDetailForCart(cartId: string): Promise<CartDetail> {
  const lines = await getRawLines(cartId);
  return buildCartDetail(lines);
}

/* ---------------------------------- merge ---------------------------------- */

/** Merge the guest cart into the user's active cart on sign-in. */
export async function mergeGuestCart(guestToken: string, userId: string): Promise<void> {
  const db = await getDb();
  const guest = await findCartByToken(guestToken);
  if (!guest) return;
  // Ownership guard: a cart row that already belongs to another account
  // (stale cookie from a previous sign-in) must never be absorbed.
  if (guest.user_id && guest.user_id !== userId) return;

  const userCart = await findActiveCartForUser(userId);
  if (userCart && userCart.id === guest.id) return; // already attached

  const guestLines = await getRawLines(guest.id);
  const target = userCart ?? (await createCart(userId));

  const products = await getProductsBySlugs(guestLines.map((l) => l.productSlug));
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  for (const line of guestLines) {
    const product = bySlug.get(line.productSlug);
    if (!product) continue;
    const storedIds = splitVariantIds(line.variantId);
    const allKnown =
      line.variantId === null ||
      storedIds.every((id) => product.variants.some((v) => v.id === id));
    if (line.variantId !== null && !allKnown) continue; // stale option
    await addLine(target.id, product.id, line.variantId, line.qty);
  }

  await db.batch([
    { sql: `UPDATE carts SET status = 'merged' WHERE id = ?`, params: [guest.id] },
    { sql: `DELETE FROM cart_items WHERE cart_id = ?`, params: [guest.id] },
    { sql: `UPDATE carts SET user_id = ? WHERE id = ?`, params: [userId, target.id] },
  ]);
}
