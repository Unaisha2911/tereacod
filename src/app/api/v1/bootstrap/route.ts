import { withApi, ok } from "@/server/api/guard";
import { toUserProfile, getUserById } from "@/server/repos/users";
import { isStaff } from "@/server/rbac";
import { readCartToken } from "@/server/api/http";
import { getActiveCart, getRawLines, buildCartDetail, DELIVERY_METHOD_LABELS } from "@/server/repos/cart";
import { getSiteSettings, getDeliveryConfig } from "@/server/repos/settings";
import { listSavedItemIds } from "@/server/repos/users";
import { CART_COOKIE } from "@/server/env";
import type { CartDetail, CartLine, SavedItem, UserProfile } from "@/types";

const EMPTY_DETAIL: CartDetail = {
  lines: [],
  totals: { subtotal: 0, deliveryFee: 0, total: 0, itemCount: 0 },
  hasBlocked: false,
};

/**
 * GET /api/v1/bootstrap — the ONE request that hydrates the whole client
 * shell on page load.
 *
 * The client used to fan out into three (often four) concurrent API calls —
 * auth/session, cart, site/settings, account/saved — each resolving its own
 * identity/cart in D1, which doubled cart work and multiplied subrequests on
 * exactly the cold-isolate bursts that trip the Workers CPU limit. This
 * endpoint resolves the cart ONCE and returns identity + cart + WhatsApp
 * settings in a single payload.
 *
 * Request budget after this endpoint (every public page):
 *   guest, no cart cookie :  1 request total, zero D1 queries (KV reads cached)
 *   signed-in             :  1 request total — saved items now ride in the
 *                            same payload (the separate GET /account/saved
 *                            per page load is gone; guests skip them entirely)
 *
 * The admin-editable delivery config rides along too, so /cart and /checkout
 * render their fee estimates without touching GET /checkout/config.
 */
export const GET = withApi(
  { rateLimit: { limit: 60, windowMs: 60 * 1000, key: "bootstrap" } },
  async ({ identity, request }) => {
    const token = await readCartToken(request);

    // ONE cart resolution shared by badge + payload. The old pair
    // (session + cart endpoints) resolved the cart twice per page load.
    const cart = await getActiveCart(token, identity?.user.id ?? null);
    const lines: CartLine[] = cart ? await getRawLines(cart.id) : [];
    const detail = lines.length > 0 ? await buildCartDetail(lines) : EMPTY_DETAIL;

    let user: UserProfile | null = null;
    let staff = false;
    let saved: SavedItem[] = [];
    if (identity) {
      // identity.roles already carries the permission set resolved by
      // getCurrentIdentity — re-querying RBAC here (as the old session
      // route did) was a redundant cached read.
      const row = await getUserById(identity.user.id);
      user = row ? toUserProfile(row) : null;
      staff = isStaff(identity.roles);
      // Saved items ride in the same payload (signed-in only; the account
      // mirror stays authoritative). No extra round trip — one D1 read.
      saved = await listSavedItemIds(identity.user.id);
    }

    // WhatsApp number + delivery config ride along — the old path fetched
    // /api/v1/site/settings and /api/v1/checkout/config as extra requests
    // from the cart and checkout pages. The config arrives in the EXACT
    // client shape /checkout/config returns (same conversion, one source:
    // DELIVERY_METHOD_LABELS), so the client seeds its store verbatim.
    const [settings, delivery] = await Promise.all([getSiteSettings(), getDeliveryConfig()]);

    return ok({
      user,
      isStaff: staff,
      lines,
      detail,
      saved,
      whatsapp: settings?.contact?.whatsapp ?? null,
      delivery: {
        freeThreshold: delivery.freeThresholdFils / 100,
        methods: {
          standard: { ...DELIVERY_METHOD_LABELS.standard, fee: delivery.standardFeeFils / 100 },
          express: { ...DELIVERY_METHOD_LABELS.express, fee: delivery.expressFeeFils / 100 },
        },
      },
      cartCookiePresent: Boolean(token),
      cookieName: CART_COOKIE,
    });
  }
);
