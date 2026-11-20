import type { Metadata } from "next";
import { canonical, itemListJsonLd, JsonLd } from "@/lib/seo";
import { toCardItems } from "@/lib/catalog-card";
import { DiscoverView } from "./discover-view";
import { getCategories } from "@/server/data";
import { listProducts } from "@/server/repos/catalog";

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
  openGraph: {
    title: "Browse All Heat-Not-Burn Sticks — Full Catalog",
    description:
      "The full TereaCOD range — heat-not-burn tobacco sticks made for IQOS ILUMA across all seven origin lines, UAE-wide delivery with cash or card on delivery.",
    url: "/discover",
    siteName: "TereaCOD",
    type: "website",
    locale: "en_AE",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "TereaCOD full catalog — TEREA sticks and IQOS devices delivered across the UAE" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse All Heat-Not-Burn Sticks — Full Catalog",
    images: ["/og-image.jpg"],
  },
};

/**
 * Discover — server-rendered shelf, loaded in batches.
 *
 * The FIRST 16 products and their total come from one paginated catalog
 * read (cached 10s) and render straight in the HTML — crawlable, LCP-ready.
 * The client island fetches every further batch from
 * /api/v1/catalog/products on demand (Load more / sort / availability), so
 * the page no longer serializes the ENTIRE catalog into every request —
 * the heaviest storefront render and a Workers 1102 contributor.
 */
export default async function DiscoverPage() {
  const [shelf, categories] = await Promise.all([
    listProducts({ page: 1, pageSize: 16 }),
    getCategories(),
  ]);
  const cardItems = toCardItems(shelf.items);
  return (
    <>
      {/* ItemList rich result — sibling shelf pages carry the same graph. */}
      <JsonLd data={itemListJsonLd(cardItems, "Full TereaCOD catalog — TEREA sticks and IQOS devices UAE")} />
      <DiscoverView initialItems={cardItems} total={shelf.total} initialCategories={categories} />
    </>
  );
}
