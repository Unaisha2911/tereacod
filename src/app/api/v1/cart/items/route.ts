import { z } from "zod";
import { NextResponse } from "next/server";
import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { readCartToken, setCartCookie } from "@/server/api/http";
import {
  getActiveCart,
  createCart,
  addLine,
  getCartDetailForCart,
  getRawLines,
} from "@/server/repos/cart";
import { getProduct } from "@/server/repos/catalog";

const bodySchema = z.object({
  productSlug: z.string().min(1),
  variantId: z.string().nullable().optional(),
  qty: z.number().int().min(1).max(99).optional(),
});

/** POST /api/v1/cart/items — add a line (creates the guest cart on first add). */
export const POST = withApi({ rateLimit: { limit: 60, windowMs: 60 * 1000, key: "cart:mutate" } }, async ({ request, identity }) => {
  const body = bodySchema.parse(await request.json());
  const qty = body.qty ?? 1;

  const product = await getProduct(body.productSlug);
  if (!product) {
    return fail(404, ErrorCode.NOT_FOUND, "This product does not exist.");
  }
  if (product.availability === "out_of_stock" || product.availability === "unavailable") {
    return fail(409, ErrorCode.UNAVAILABLE, "This product cannot be added right now.");
  }
  if (body.variantId) {
    // The line may carry several selected options (colour + origin) joined
    // with "|" — every one of them must exist and be available.
    const ids = body.variantId.split("|").filter(Boolean);
    const invalid = ids.some((id) => {
      const variant = product.variants.find((v) => v.id === id);
      return !variant || !variant.available;
    });
    if (ids.length === 0 || invalid) {
      return fail(409, ErrorCode.UNAVAILABLE, "This option is no longer available.");
    }
  }

  const token = await readCartToken(request);
  let cart = await getActiveCart(token, identity?.user.id ?? null);
  let issuedToken: string | null = null;
  if (!cart) {
    cart = await createCart(identity?.user.id ?? null);
    issuedToken = cart.token;
  }

  await addLine(cart.id, product.id, body.variantId ?? null, qty);
  const [detail, lines] = await Promise.all([
    getCartDetailForCart(cart.id),
    getRawLines(cart.id),
  ]);

  const response = NextResponse.json({ data: { lines, detail } });
  if (issuedToken) {
    await setCartCookie(response, issuedToken);
  }
  return response;
});
