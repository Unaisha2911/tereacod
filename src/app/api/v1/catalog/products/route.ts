import { withApi, ok, CDN_CACHE } from "@/server/api/guard";
import { getProductsByIds, getProductsBySlugs, listProducts } from "@/server/repos/catalog";
import { originLineBySlug } from "@/lib/catalog-origin";
import type { SortKey } from "@/lib/catalog-sort";

export const GET = withApi({}, async ({ request }) => {
  const { searchParams } = new URL(request.url);

  // Subset fetch: ?ids=a,b,c / ?slugs=x,y,z resolve exact products without
  // paging the whole catalog. This is what the client mirror uses for cart
  // line details, saved items and quick-add — one small request instead of
  // the previous full-catalog download.
  const idsParam = searchParams.get("ids");
  const slugsParam = searchParams.get("slugs");
  if (idsParam || slugsParam) {
    const ids = (idsParam ?? "").split(",").map((v) => v.trim()).filter(Boolean);
    const slugs = (slugsParam ?? "").split(",").map((v) => v.trim()).filter(Boolean);
    const items = ids.length > 0 ? await getProductsByIds(ids) : await getProductsBySlugs(slugs);
    return ok(items, { pagination: { page: 1, pageSize: items.length, total: items.length, hasMore: false } }, { headers: CDN_CACHE.catalog });
  }

  // `origin` accepts an origin-line slug (japan / indonesia / duty-free) —
  // unknown slugs resolve to no filter rather than an empty result set.
  const originSlug = searchParams.get("origin") ?? undefined;
  const originLine = originSlug ? (originLineBySlug(originSlug)?.dbValue ?? undefined) : undefined;
  const page = await listProducts({
    categorySlug: searchParams.get("collection") ?? searchParams.get("category") ?? undefined,
    brandSlug: searchParams.get("brand") ?? undefined,
    originLine,
    query: searchParams.get("q") ?? undefined,
    sort: (searchParams.get("sort") as SortKey | null) ?? undefined,
    availability: (searchParams.get("availability") as "in_stock" | "all" | null) ?? undefined,
    page: Number(searchParams.get("page") ?? 1) || 1,
    pageSize: Number(searchParams.get("pageSize") ?? 9) || 9,
  });
  return ok(page, {
    pagination: {
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      hasMore: page.hasMore,
    },
  }, { headers: CDN_CACHE.catalog });
});
