import { NextResponse } from "next/server";
import { withApi } from "@/server/api/guard";
import { readCartToken, clearCartCookie } from "@/server/api/http";
import { mergeGuestCart, findActiveCartForUser, getRawLines } from "@/server/repos/cart";

/**
 * POST /api/v1/cart/merge — called by the client after sign-in: merges the
 * guest cart (cookie) into the user's active cart and returns the merged lines.
 */
export const POST = withApi({ requireAuth: true }, async ({ request, identity }) => {
  const guestToken = await readCartToken(request);
  if (guestToken) {
    await mergeGuestCart(guestToken, identity!.user.id);
  }
  const cart = await findActiveCartForUser(identity!.user.id);
  const lines = cart ? await getRawLines(cart.id) : [];
  const response = NextResponse.json({ data: { lines } });
  if (guestToken) clearCartCookie(response);
  return response;
});
