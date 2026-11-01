import { withApi, ok, fail, ErrorCode, CDN_CACHE } from "@/server/api/guard";
import { getProduct, getRelatedProducts } from "@/server/repos/catalog";

export const GET = withApi({}, async ({ request, params }) => {
  const item = await getProduct(params.slug);
  if (!item) {
    return fail(404, ErrorCode.NOT_FOUND, `No product found for slug "${params.slug}".`);
  }
  if (new URL(request.url).searchParams.get("related") === "1") {
    const related = await getRelatedProducts(params.slug);
    return ok({ product: item, related }, undefined, { headers: CDN_CACHE.catalog });
  }
  return ok(item, undefined, { headers: CDN_CACHE.catalog });
});
