import { withApi, ok } from "@/server/api/guard";
import { toUserProfile, getUserById } from "@/server/repos/users";
import { isStaff } from "@/server/rbac";
import { readCartToken } from "@/server/api/http";
import { getActiveCart, getRawLines, buildCartDetail } from "@/server/repos/cart";
import { getSiteSettings } from "@/server/repos/settings";
import { CART_COOKIE } from "@/server/env";
import type { CartDetail, CartLine, UserProfile } from "@/types";

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
 * settings in a single payload; saved-items stay a separate signed-in-only
 * request (guests skip it entirely).
 *
 * Anonymous visitor with no cart cookie: zero D1 queries (one KV settings
 * read, cached).
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
    if (identity) {
      // identity.roles already carries the permission set resolved by
      // getCurrentIdentity — re-querying RBAC here (as the old session
      // route did) was a redundant cached read.
      const row = await getUserById(identity.user.id);
      user = row ? toUserProfile(row) : null;
      staff = isStaff(identity.roles);
    }

    // WhatsApp number rides along — the old path fetched /api/v1/site/settings
    // as a third request on every first load.
    const settings = await getSiteSettings();

    return ok({
      user,
      isStaff: staff,
      lines,
      detail,
      whatsapp: settings?.contact?.whatsapp ?? null,
      cartCookiePresent: Boolean(token),
      cookieName: CART_COOKIE,
    });
  }
);
