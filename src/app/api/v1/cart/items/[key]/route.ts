import { z } from "zod";
import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { readCartToken } from "@/server/api/http";
import { getActiveCart, setLineQty, removeLine, getCartDetailForCart, getRawLines } from "@/server/repos/cart";
import { getProduct } from "@/server/repos/catalog";

const patchSchema = z.object({ qty: z.number().int().min(0).max(99) });

/** Line key format: "<productSlug>:<variantId|->" */
function parseKey(key: string): { slug: string; variantId: string | null } | null {
  const idx = key.lastIndexOf(":");
  if (idx <= 0) return null;
  const slug = key.slice(0, idx);
  const variant = key.slice(idx + 1);
  return { slug, variantId: variant === "-" ? null : variant };
}

async function resolveCart(request: Request, userId: string | null) {
  const token = await readCartToken(request);
  return getActiveCart(token, userId);
}

/** PATCH /api/v1/cart/items/:key — update quantity (0 removes). */
export const PATCH = withApi({ rateLimit: { limit: 60, windowMs: 60 * 1000, key: "cart:mutate" } }, async ({ request, params, identity }) => {
  const body = patchSchema.parse(await request.json());
  const parsed = parseKey(params.key);
  if (!parsed) return fail(400, ErrorCode.VALIDATION_FAILED, "Invalid cart line key.");

  const cart = await resolveCart(request, identity?.user.id ?? null);
  if (!cart) return fail(404, ErrorCode.NOT_FOUND, "No active cart.");

  const product = await getProduct(parsed.slug);
  if (!product) return fail(404, ErrorCode.NOT_FOUND, "This product does not exist.");

  await setLineQty(cart.id, product.id, parsed.variantId, body.qty);
  const [detail, lines] = await Promise.all([
    getCartDetailForCart(cart.id),
    getRawLines(cart.id),
  ]);
  return ok({ lines, detail });
});

/** DELETE /api/v1/cart/items/:key — remove a line. */
export const DELETE = withApi({}, async ({ request, params, identity }) => {
  const parsed = parseKey(params.key);
  if (!parsed) return fail(400, ErrorCode.VALIDATION_FAILED, "Invalid cart line key.");

  const cart = await resolveCart(request, identity?.user.id ?? null);
  if (!cart) return ok({ lines: [], detail: null });

  const product = await getProduct(parsed.slug);
  if (product) {
    await removeLine(cart.id, product.id, parsed.variantId);
  }
  const [detail, lines] = await Promise.all([
    getCartDetailForCart(cart.id),
    getRawLines(cart.id),
  ]);
  return ok({ lines, detail });
});
