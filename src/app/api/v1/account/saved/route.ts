import { z } from "zod";
import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import {
  listSavedItemIds,
  toggleSavedItem,
  removeSavedItem,
} from "@/server/repos/users";
import { getProductsByIds } from "@/server/repos/catalog";

export const GET = withApi({ requireAuth: true }, async ({ identity }) => {
  const saved = await listSavedItemIds(identity!.user.id);
  const items = await getProductsByIds(saved.map((s) => s.itemId));
  return ok({ saved, items });
});

const postSchema = z.object({ productId: z.string().min(1) });

/** POST — toggle a saved item. Returns the resulting state. */
export const POST = withApi({ requireAuth: true }, async ({ request, identity }) => {
  const body = postSchema.parse(await request.json());
  const state = await toggleSavedItem(identity!.user.id, body.productId);
  return ok({ state });
});

export const DELETE = withApi({ requireAuth: true }, async ({ request, identity }) => {
  const productId = new URL(request.url).searchParams.get("product");
  if (!productId) {
    return fail(422, ErrorCode.VALIDATION_FAILED, "Provide the product to remove.");
  }
  await removeSavedItem(identity!.user.id, productId);
  return ok({ ok: true });
});
