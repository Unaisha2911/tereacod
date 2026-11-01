import { withApi, ok, CDN_CACHE } from "@/server/api/guard";
import { suggestProducts } from "@/server/repos/catalog";

export const GET = withApi(
  // Suggest runs on every keystroke — per-IP ceiling instead of an open FTS relay.
  { rateLimit: { limit: 120, windowMs: 60 * 1000, key: "search:suggest" } },
  async ({ request }) => {
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const suggestions = await suggestProducts(q, 6);
    return ok({ suggestions }, undefined, { headers: CDN_CACHE.search });
  }
);
