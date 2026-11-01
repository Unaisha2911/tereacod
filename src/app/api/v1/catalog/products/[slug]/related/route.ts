import { withApi, ok, CDN_CACHE } from "@/server/api/guard";
import { getRelatedProducts } from "@/server/repos/catalog";

export const GET = withApi({}, async ({ params }) => {
  const related = await getRelatedProducts(params.slug);
  return ok({ items: related, total: related.length }, undefined, { headers: CDN_CACHE.catalog });
});
