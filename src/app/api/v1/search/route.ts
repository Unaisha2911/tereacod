import { withApi, ok, CDN_CACHE } from "@/server/api/guard";
import { searchProducts, suggestProducts } from "@/server/repos/catalog";

export const GET = withApi(
  // FTS5 queries are cheap but unbounded query strings are not — a modest
  // ceiling stops search being used as a scrape/DoS surface.
  { rateLimit: { limit: 60, windowMs: 60 * 1000, key: "search" } },
  async ({ request }) => {
    const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
    if (!q) {
      return ok({ query: "", items: { items: [], total: 0, page: 1, pageSize: 24, hasMore: false }, suggestions: [] });
    }
    const [items, suggestions] = await Promise.all([
      searchProducts(q, 24),
      suggestProducts(q, 6),
    ]);
    return ok({ query: q, items, suggestions }, undefined, { headers: CDN_CACHE.search });
  }
);
