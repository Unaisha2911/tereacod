import { withApi, ok, CDN_CACHE } from "@/server/api/guard";
import { listCategories } from "@/server/repos/catalog";

export const GET = withApi({}, async () => {
  const categories = await listCategories();
  return ok({ total: categories.length, collections: categories }, undefined, { headers: CDN_CACHE.catalog });
});
