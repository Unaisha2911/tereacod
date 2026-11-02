import { create } from "zustand";
import type { Availability, CartDetail, CartLine, CartLineDetail, CartTotals, DeliveryMethod } from "@/types";
import {
  combinedVariantLabel,
  initialVariantSelection,
  joinVariantIds,
  selectedVariantIds,
  splitVariantIds,
  variantPriceDeltaTotal,
} from "@/lib/variant-selection";
import type { ItemVariant } from "@/types";
import {
  ensureCatalogSubset,
  findInCatalog,
  isCatalogLoaded,
} from "@/lib/client-catalog";

/**
 * CART STORE + SERVICE (API-backed)
 * ---------------------------------
 * The server cart (D1) is the source of truth for pricing and availability;
 * it is re-verified at quote and order creation. This store keeps the UI
 * instant: every mutation applies optimistically, then reconciles with the
 * server response. Hydration happens from GET /api/v1/cart via the app
 * bootstrap provider (hydrateFromServer).
 */

/** Maximum units per line accepted by the checkout API. */
const MAX_QTY = 99;

/** Fallback estimate constants — the live values come from /api/v1/checkout/config. */
export const FREE_DELIVERY_THRESHOLD = 200;
export const STANDARD_DELIVERY_FEE = 25;
export const EXPRESS_DELIVERY_FEE = 35;

export const DELIVERY_METHODS: Record<DeliveryMethod, { label: string; fee: number; eta: string }> = {
  standard: { label: "Standard delivery", fee: STANDARD_DELIVERY_FEE, eta: "1-hour delivery in Dubai · same-day UAE-wide" },
  express: { label: "Express delivery", fee: EXPRESS_DELIVERY_FEE, eta: "Arrives next day" },
};

/** Stable cart-line identity (matches the API). */
export const cartLineKey = (productSlug: string, variantId: string | null): string =>
  `${productSlug}:${variantId ?? "-"}`;

interface CartState {
  lines: CartLine[];
  /** True once server-hydrated lines are available. */
  hydrated: boolean;
  addItem: (productSlug: string, variantId: string | null, qty?: number) => void;
  removeLine: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  setLines: (lines: CartLine[]) => void;
  setHydrated: (hydrated: boolean) => void;
  clear: () => void;
}

const isCartLine = (value: unknown): value is CartLine =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as CartLine).productSlug === "string" &&
  ((value as CartLine).variantId === null || typeof (value as CartLine).variantId === "string") &&
  typeof (value as CartLine).qty === "number" &&
  Number.isFinite((value as CartLine).qty) &&
  (value as CartLine).qty >= 1;

export const useCart = create<CartState>((set, get) => ({
  lines: [],
  hydrated: false,
  addItem: (productSlug, variantId, qty = 1) => {
    const key = cartLineKey(productSlug, variantId);
    const existing = get().lines.find((line) => cartLineKey(line.productSlug, line.variantId) === key);
    const nextQty = Math.min(MAX_QTY, (existing?.qty ?? 0) + Math.max(1, qty));
    set((state) => ({
      lines: existing
        ? state.lines.map((line) =>
            cartLineKey(line.productSlug, line.variantId) === key ? { ...line, qty: nextQty } : line
          )
        : [...state.lines, { productSlug, variantId, qty: Math.min(MAX_QTY, Math.max(1, qty)) }],
    }));
    void syncAdd(productSlug, variantId, qty);
  },
  removeLine: (key) => {
    const target = get().lines.find((line) => cartLineKey(line.productSlug, line.variantId) === key);
    set((state) => ({
      lines: state.lines.filter((line) => cartLineKey(line.productSlug, line.variantId) !== key),
    }));
    if (target) void syncMutation(() => removeLineApi(target.productSlug, target.variantId));
  },
  setQty: (key, qty) => {
    const target = get().lines.find((line) => cartLineKey(line.productSlug, line.variantId) === key);
    if (qty < 1) {
      get().removeLine(key);
      return;
    }
    set((state) => ({
      lines: state.lines.map((line) =>
        cartLineKey(line.productSlug, line.variantId) === key ? { ...line, qty: Math.min(MAX_QTY, qty) } : line
      ),
    }));
    if (target) void syncMutation(() => patchLineApi(target.productSlug, target.variantId, qty));
  },
  setLines: (lines) => set({ lines: lines.filter(isCartLine) }),
  setHydrated: (hydrated) => set({ hydrated }),
  clear: () => {
    set({ lines: [] });
    void syncMutation(() => clearCartApi());
  },
}));

/* ------------------------------ API plumbing ------------------------------ */

interface CartApiResponse {
  data: { lines: CartLine[]; detail: CartDetail | null };
}

async function requestCart(path: string, init?: RequestInit): Promise<CartLine[] | null> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as CartApiResponse;
    const lines = body.data?.lines;
    if (Array.isArray(lines)) {
      useCart.getState().setLines(lines);
      return lines;
    }
    return null;
  } catch {
    return null; // offline — the optimistic store state stands
  }
}

async function syncAdd(productSlug: string, variantId: string | null, qty: number): Promise<void> {
  await requestCart("/api/v1/cart/items", {
    method: "POST",
    body: JSON.stringify({ productSlug, variantId, qty }),
  });
}

async function patchLineApi(productSlug: string, variantId: string | null, qty: number): Promise<void> {
  await requestCart(`/api/v1/cart/items/${encodeURIComponent(cartLineKey(productSlug, variantId))}`, {
    method: "PATCH",
    body: JSON.stringify({ qty }),
  });
}

async function removeLineApi(productSlug: string, variantId: string | null): Promise<void> {
  await requestCart(`/api/v1/cart/items/${encodeURIComponent(cartLineKey(productSlug, variantId))}`, {
    method: "DELETE",
  });
}

async function clearCartApi(): Promise<void> {
  await requestCart("/api/v1/cart", { method: "DELETE" });
}

async function syncMutation(operation: () => Promise<unknown>): Promise<void> {
  await operation();
}

/** Merge the guest cart into the account cart after sign-in. */
export async function mergeCartAfterSignIn(): Promise<void> {
  try {
    const response = await fetch("/api/v1/cart/merge", { method: "POST" });
    if (response.ok) {
      const body = (await response.json()) as { data: { lines: CartLine[] } };
      useCart.getState().setLines(Array.isArray(body.data?.lines) ? body.data.lines : []);
    }
  } catch {
    // Offline — the local cart state stands.
  }
}

/** Bootstrap hydration — called once by the app bootstrap provider. */
export async function hydrateCartFromServer(): Promise<void> {
  try {
    const response = await fetch("/api/v1/cart", { headers: { accept: "application/json" } });
    let hasLines = false;
    if (response.ok) {
      const body = (await response.json()) as CartApiResponse;
      const lines = Array.isArray(body.data?.lines) ? body.data.lines : [];
      hasLines = lines.length > 0;
      // Union-merge instead of replace: a quick-add in the first few hundred
      // milliseconds (optimistic store write) must not be clobbered by an
      // in-flight GET that started before the POST committed. Any line that
      // was legitimately removed elsewhere gets reconciled on the next
      // mutation, which always rewrites from the server response.
      const local = useCart.getState().lines;
      if (local.length > 0) {
        const serverKeys = new Set(lines.map((l) => cartLineKey(l.productSlug, l.variantId)));
        const localOnly = local.filter((l) => !serverKeys.has(cartLineKey(l.productSlug, l.variantId)));
        useCart.getState().setLines([...lines, ...localOnly]);
      } else {
        useCart.getState().setLines(lines);
      }
    }
    // The mirror is ONLY needed to derive line details (names, variants,
    // prices) for display — and now loads JUST the cart's slugs (one small
    // request) instead of paging the whole catalog. An empty cart — every
    // fresh visitor — skips even that.
    if (hasLines) {
      const slugs = [...new Set(useCart.getState().lines.map((l) => l.productSlug))];
      void ensureCatalogSubset({ slugs }).catch(() => undefined);
    }
  } catch {
    // Offline or API unavailable — keep whatever the store has.
  } finally {
    useCart.getState().setHydrated(true);
  }
}

/** Optional live-fee override from GET /api/v1/checkout/config (AED units). */
export interface DeliveryFeeConfigOverride {
  freeThreshold: number;
  standardFee: number;
  expressFee: number;
}

/** Delivery fee estimate for a subtotal under a chosen method (client estimate). */
export function deliveryFeeFor(
  subtotal: number,
  method: DeliveryMethod = "standard",
  config?: Partial<DeliveryFeeConfigOverride>
): number {
  const freeThreshold = config?.freeThreshold ?? FREE_DELIVERY_THRESHOLD;
  const standardFee = config?.standardFee ?? STANDARD_DELIVERY_FEE;
  const expressFee = config?.expressFee ?? EXPRESS_DELIVERY_FEE;
  if (method === "express") return expressFee;
  return subtotal >= freeThreshold ? 0 : standardFee;
}

const isProductBlocked = (availability: Availability): boolean =>
  availability === "out_of_stock" || availability === "unavailable";

function resolveLine(line: CartLine): CartLineDetail | null {
  const product = findInCatalog(line.productSlug);
  // Silently drop stale lines whose product no longer resolves.
  if (!product) return null;

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
    const hasMissing = variants.some((v) => v === null);
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
  return {
    key: cartLineKey(product.slug, line.variantId),
    product,
    variants: resolved,
    variantLabel: combinedVariantLabel(resolved),
    qty: line.qty,
    // Every selected option's delta is part of the authoritative unit price
    // (server repos/cart.ts resolves the same way) — omitting them would
    // understate every displayed total vs what the order charges.
    unitPrice: product.price + variantPriceDeltaTotal(resolved),
    lineTotal: (product.price + variantPriceDeltaTotal(resolved)) * line.qty,
    blocked,
    blockedReason,
  };
}

function buildTotals(lines: CartLineDetail[]): CartTotals {
  const purchasable = lines.filter((line) => !line.blocked);
  const subtotal = purchasable.reduce((sum, line) => sum + line.lineTotal, 0);
  const itemCount = purchasable.reduce((sum, line) => sum + line.qty, 0);
  const deliveryFee = deliveryFeeFor(subtotal, "standard");
  return { subtotal, deliveryFee, total: subtotal + deliveryFee, itemCount };
}

/**
 * cartService — pure helpers over the store. `getCartDetail` is the single
 * source of truth for cart pricing in the UI; the authoritative totals are
 * computed server-side at quote/order time.
 */
export const cartService = {
  getCartDetail(lines: CartLine[]): CartDetail {
    if (!isCatalogLoaded()) {
      return {
        lines: [],
        totals: { subtotal: 0, deliveryFee: 0, total: 0, itemCount: 0 },
        hasBlocked: false,
      };
    }
    const resolved = lines
      .map(resolveLine)
      .filter((line): line is CartLineDetail => line !== null);
    return {
      lines: resolved,
      totals: buildTotals(resolved),
      hasBlocked: resolved.some((line) => line.blocked),
    };
  },

  /**
   * Default "add" configuration — the EXACT configuration the product page
   * pre-selects: the first AVAILABLE option of EVERY present group (colour
   * AND origin, joined with "|"). Quick-add must mirror it — resolving only
   * the first variant left every other group unselected, so a listing card
   * could add "Midnight Blue" while the product page default was
   * "Midnight Blue + Japan" at a different (origin-premium) price.
   *
   * Returns the joined variant id plus the delta-adjusted unit price for the
   * confirmation toast, or null when the product is not in the mirror.
   */
  defaultVariantConfig(productSlug: string): { variantId: string | null; unitPrice: number } | null {
    const product = findInCatalog(productSlug);
    if (!product) return null;
    const ids = selectedVariantIds(initialVariantSelection(product.variants));
    if (ids.length === 0) return { variantId: null, unitPrice: product.price };
    const byId = new Map(product.variants.map((v) => [v.id, v]));
    const resolved = ids
      .map((id) => byId.get(id))
      .filter((v): v is ItemVariant => Boolean(v));
    return {
      variantId: joinVariantIds(ids),
      unitPrice: product.price + variantPriceDeltaTotal(resolved),
    };
  },

  /** Live unit count for badges (all lines, blocked included). */
  liveCount(lines: CartLine[]): number {
    return lines.reduce((sum, line) => sum + line.qty, 0);
  },

  addItem(productSlug: string, variantId: string | null, qty = 1) {
    useCart.getState().addItem(productSlug, variantId, qty);
  },
  removeLine(key: string) {
    useCart.getState().removeLine(key);
  },
  setQty(key: string, qty: number) {
    useCart.getState().setQty(key, qty);
  },
  clear() {
    useCart.getState().clear();
  },
};
