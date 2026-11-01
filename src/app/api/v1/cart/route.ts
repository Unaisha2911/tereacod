import { withApi, ok } from "@/server/api/guard";
import { readCartToken, clearCartCookie } from "@/server/api/http";
import { getActiveCart, getCartDetailForCart, getRawLines, clearCart } from "@/server/repos/cart";
import type { CartLine } from "@/types";

/** GET /api/v1/cart — server-authoritative cart detail + raw lines. */
export const GET = withApi({ rateLimit: { limit: 60, windowMs: 60 * 1000, key: "cart:mutate" } }, async ({ request, identity }) => {
  const token = await readCartToken(request);
  const cart = await getActiveCart(token, identity?.user.id ?? null);
  if (!cart) {
    return ok({
      lines: [] as CartLine[],
      detail: {
        lines: [],
        totals: { subtotal: 0, deliveryFee: 0, total: 0, itemCount: 0 },
        hasBlocked: false,
      },
    });
  }
  const [detail, lines] = await Promise.all([
    getCartDetailForCart(cart.id),
    getRawLines(cart.id),
  ]);
  return ok({ lines, detail });
});

/** DELETE /api/v1/cart — clear all lines. */
export const DELETE = withApi({}, async ({ request, identity }) => {
  const token = await readCartToken(request);
  const cart = await getActiveCart(token, identity?.user.id ?? null);
  if (cart) {
    await clearCart(cart.id);
  }
  const response = ok({ ok: true });
  clearCartCookie(response);
  return response;
});
