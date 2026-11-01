import { withApi, ok, CDN_CACHE } from "@/server/api/guard";
import { listProducts } from "@/server/repos/catalog";
import { originLineBySlug } from "@/lib/catalog-origin";
import type { SortKey } from "@/lib/catalog-sort";

export const GET = withApi({}, async ({ request }) => {
  const { searchParams } = new URL(request.url);
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
