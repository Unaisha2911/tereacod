import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import { toCardItems } from "@/lib/catalog-card";
import { DiscoverView } from "./discover-view";
import { getCategories, getProducts } from "@/server/data";

export const metadata: Metadata = {
  title: "Browse All Heat-Not-Burn Sticks — Full Catalog",
  description:
    "Browse the full TereaCOD range — heat-not-burn tobacco sticks made for IQOS ILUMA across all seven origin lines: Uzbekistan, Tajikistan, Kyrgyzstan, Indonesia, Switzerland (Duty Free), Japan and Italy. Filter by collection or origin, load more and check out with cash on delivery.",
  keywords: [
    "terea delivery uae",
    "terea cash on delivery",
    "buy terea sticks online uae",
    "terea japan uae",
    "terea indonesia uae",
    "terea uzbekistan uae",
    "terea switzerland duty free uae",
  ],
  ...canonical("/discover"),
};

/**
 * Discover — server-rendered shelf.
 *
 * The catalog and categories are read on the server (isolate-cached) and
 * handed to the client island as card projections. This removes the old
 * first-paint spinner + full-catalog API waterfall entirely: HTML arrives
 * with the grid already rendered (crawlable, LCP-ready), and the client
 * island only handles filter/sort/load-more interactions over the
 * in-memory projection.
 */
export default async function DiscoverPage() {
  const [items, categories] = await Promise.all([getProducts(), getCategories()]);
  return <DiscoverView initialItems={toCardItems(items)} initialCategories={categories} />;
}
