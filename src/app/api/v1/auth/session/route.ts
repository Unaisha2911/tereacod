import { withApi, ok } from "@/server/api/guard";
import { toUserProfile, getUserById } from "@/server/repos/users";
import { getUserPermissionSet, isStaff } from "@/server/rbac";
import { readCartToken } from "@/server/api/http";
import { getActiveCart, getRawLines } from "@/server/repos/cart";
import { CART_COOKIE } from "@/server/env";

/**
 * Session bootstrap for client hydration: current user (or null), staff flag
 * and the live cart line count for badges.
 */
export const GET = withApi({}, async ({ identity, request }) => {
  if (!identity) {
    // Anonymous: report guest cart count from the cart cookie.
    const token = await readCartToken(request);
    const cart = token ? await getActiveCart(token, null) : null;
    const lines = cart ? await getRawLines(cart.id) : [];
    return ok({
      user: null,
      isStaff: false,
      cartCount: lines.reduce((sum, line) => sum + line.qty, 0),
      cartCookiePresent: Boolean(token),
      cookieName: CART_COOKIE,
    });
  }

  const [row, roles] = await Promise.all([
    getUserById(identity.user.id),
    getUserPermissionSet(identity.user.id),
  ]);
  const token = await readCartToken(request);
  const cart = await getActiveCart(token, identity.user.id);
  const lines = cart ? await getRawLines(cart.id) : [];
  const staff = isStaff(roles);

  return ok({
    user: row ? toUserProfile(row) : null,
    isStaff: staff,
    cartCount: lines.reduce((sum, line) => sum + line.qty, 0),
    cartCookiePresent: Boolean(token),
  });
});
