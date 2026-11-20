/**
 * CLIENT BOOTSTRAP — one request to hydrate everything.
 * -----------------------------------------------------
 * hydrateFromServer() fetches GET /api/v1/bootstrap ONCE per page load and
 * fills the auth store, the cart store, the WhatsApp number, the delivery
 * config (cart/checkout fee estimates) and the client catalog mirror (the
 * cart payload already carries its products) from the single payload. For
 * signed-in users the saved-items list rides in the same payload — there is
 * no separate per-page request at all.
 *
 * Request budget per page load (every public page):
 *   guest                 :  1 request  (zero D1 queries server-side)
 *   guest with cart       :  1 request
 *   signed-in             :  1 request  (saved items included)
 *
 * If the bootstrap endpoint is unreachable (old deployment mid-release,
 * network blip) the legacy parallel fan-out — auth/session + cart +
 * site/settings — runs instead, so behaviour degrades to exactly what
 * shipped before.
 */

import { useAuth } from "@/services/account";
import { useCart, cartLineKey } from "@/services/cart";
import { hydrateSavedItemsFromServer, useSavedItems } from "@/services/saved-items";
import { setWhatsAppNumber } from "@/services/whatsapp";
import { seedDeliveryConfig } from "@/services/checkout";
import { ensureCatalogSubset, seedCatalog } from "@/lib/client-catalog";
import { fetchJsonWithRetry } from "@/lib/client-fetch";
import type { CartDetail, CartLine, SavedItem, UserProfile } from "@/types";

/** The client-shaped delivery config the bootstrap payload carries. */
interface DeliveryConfigPayload {
  freeThreshold: number;
  methods: {
    standard: { label: string; fee: number; eta: string };
    express: { label: string; fee: number; eta: string };
  };
}

interface BootstrapPayload {
  user: UserProfile | null;
  isStaff: boolean;
  lines: CartLine[];
  detail: CartDetail | null;
  saved?: SavedItem[];
  whatsapp: string | null;
  delivery?: DeliveryConfigPayload;
  cartCookiePresent: boolean;
  cookieName: string;
}

export async function hydrateFromServer(): Promise<void> {
  try {
    // Transient 5xx/network blips retry here — a Worker hiccup must not
    // leave the shell unhydrated for the whole page view (the "refresh
    // shows something went wrong" class of reports).
    const body = await fetchJsonWithRetry<{ data: BootstrapPayload }>("/api/v1/bootstrap");
    {
      const payload = body.data;

      // Identity — the badge/account state derives from this.
      useAuth.getState().setAuth(payload.user ?? null, Boolean(payload.isStaff));
      useAuth.getState().setHydrated();

      // Cart lines — union-merge so a quick-add that landed in the first
      // few hundred milliseconds (optimistic store write) is not clobbered
      // by this GET (same contract as the old hydrateCartFromServer).
      const lines = Array.isArray(payload.lines) ? payload.lines : [];
      const local = useCart.getState().lines;
      if (local.length > 0) {
        const serverKeys = new Set(lines.map((l) => cartLineKey(l.productSlug, l.variantId)));
        const localOnly = local.filter((l) => !serverKeys.has(cartLineKey(l.productSlug, l.variantId)));
        useCart.getState().setLines([...lines, ...localOnly]);
      } else {
        useCart.getState().setLines(lines);
      }
      useCart.getState().setHydrated(true);

      // Catalog mirror — the cart detail already embeds each line's full
      // CatalogItem, so seeding is free. Only a cart WITH lines touches the
      // mirror (identical semantics to the old subset fetch).
      if (lines.length > 0) {
        const products = (payload.detail?.lines ?? [])
          .map((l) => l.product)
          .filter((p): p is NonNullable<typeof p> => Boolean(p?.id));
        if (products.length > 0) {
          seedCatalog(products);
        } else {
          // Payload incomplete — fall back to the targeted subset request.
          const slugs = [...new Set(lines.map((l) => l.productSlug))];
          await ensureCatalogSubset({ slugs }).catch(() => undefined);
        }
      }

      // WhatsApp number from the same payload (admin-managed site setting).
      if (payload.whatsapp) setWhatsAppNumber(payload.whatsapp);

      // Delivery config — seeds the checkout/cart fee store so those pages
      // never need GET /checkout/config on load. The payload carries the
      // client shape verbatim (converted server-side from the fils config).
      if (payload.delivery) seedDeliveryConfig(payload.delivery);

      // Saved items — from the SAME payload for signed-in users (zero extra
      // requests). Guests hydrate instantly (empty). Only the guest→account
      // push of locally-bookmarked ids still talks to /account/saved, and
      // only when the visitor actually has local bookmarks.
      const savedItems = Array.isArray(payload.saved) ? payload.saved : null;
      if (savedItems && payload.user) {
        const localIds = useSavedItems
          .getState()
          .items.filter((i) => !savedItems.some((s) => s.itemId === i.itemId))
          .map((i) => i.itemId);
        // Locally-saved (guest) ids are pushed BEFORE the server list
        // replaces local state — otherwise anything bookmarked while
        // signed out is destroyed.
        await Promise.all(
          localIds.map((itemId) =>
            fetch("/api/v1/account/saved", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId: itemId }),
            }).catch(() => undefined)
          )
        );
        useSavedItems.getState().setItems(savedItems);
        useSavedItems.getState().setHydrated();
      } else {
        await hydrateSavedItemsFromServer(Boolean(payload.user));
      }
      return;
    }
  } catch {
    // Offline / endpoint unavailable — run the legacy fan-out below.
  }

  await legacyHydrate();
}

/* ------------------------- legacy fallback path --------------------------- */

const WHATSAPP_CACHE_KEY = "tereacod.whatsapp.v1";
const WHATSAPP_CACHE_TTL_MS = 10 * 60 * 1000;

function readCachedWhatsApp(): string | null {
  try {
    const raw = sessionStorage.getItem(WHATSAPP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value: string; at: number };
    if (!parsed.value || Date.now() - parsed.at > WHATSAPP_CACHE_TTL_MS) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

async function hydrateWhatsAppNumber(): Promise<void> {
  const cached = readCachedWhatsApp();
  if (cached) {
    setWhatsAppNumber(cached);
    return;
  }
  try {
    const body = await fetchJsonWithRetry<{ data: { contact?: { whatsapp?: string } } }>(
      "/api/v1/site/settings",
      undefined,
      2
    );
    const whatsapp = body.data?.contact?.whatsapp;
    if (whatsapp) {
      try {
        sessionStorage.setItem(WHATSAPP_CACHE_KEY, JSON.stringify({ value: whatsapp, at: Date.now() }));
      } catch {
        // Private mode / quota — next load refetches.
      }
      setWhatsAppNumber(whatsapp);
    }
  } catch {
    // Keep the compiled-in default.
  }
}

/** The pre-bootstrap behaviour: three parallel calls, saved-items after the session. */
async function legacyHydrate(): Promise<void> {
  const { hydrateAuthFromServer } = await import("@/services/account");
  const { hydrateCartFromServer } = await import("@/services/cart");

  const sessionReady = hydrateAuthFromServer();
  const cartReady = hydrateCartFromServer();
  void hydrateWhatsAppNumber();

  await sessionReady;
  const auth = useAuth.getState();
  await Promise.all([cartReady, hydrateSavedItemsFromServer(Boolean(auth.user))]);
}
