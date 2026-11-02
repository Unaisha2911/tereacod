import type { Metadata } from "next";
import { BrandCollectionSection } from "@/components/homepage/brand-collection-section";
import { BrandIntroSection } from "@/components/homepage/brand-intro-section";
import { CollectionPreview } from "@/components/homepage/collection-preview";
import { CompanySection } from "@/components/homepage/company-section";
import { HeroSection } from "@/components/homepage/hero-section";
import { OriginSection } from "@/components/homepage/origin-section";
import { ProductCategoriesSection } from "@/components/homepage/product-categories-section";
import { StoreCollectionsSection } from "@/components/homepage/store-collections-section";
import { SupportSection } from "@/components/homepage/support-section";
import { getBrands, getCategories, getSettings } from "@/server/data";
import { brandItemCounts, listProducts } from "@/server/repos/catalog";
import { toCardItems } from "@/lib/catalog-card";
import { canonical, itemListJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "TEREA Delivery UAE | Buy TEREA Sticks Online — Cash & Card on Delivery",
  description:
    "Order TEREA sticks online in the UAE from TereaCOD — TEREA delivery UAE-wide with 1-hour delivery from Dubai and free delivery at AED 300+. Authentic IQOS TEREA heated tobacco sticks across every origin line — Uzbekistan, Tajikistan, Kyrgyzstan, Indonesia, Switzerland (Duty Free), Japan and Italy — priced in AED and paid by cash or card on delivery.",
  ...canonical("/"),
};

/**
 * Homepage — electric section flow:
 * hero → products → categories → store collections (TEREA sticks /
 * IQOS devices) → brand collection → origins → the brand → company
 * facts → support.
 * Shell chrome (header, footer, bottom nav, ambient smoke, age gate)
 * comes from the (site) layout.
 */
export default async function HomePage() {
  // Perf: the homepage needs 8 featured cards + per-brand counts — not the
  // full catalog. listProducts({featured}) is one cached 8-row page;
  // brandItemCounts() is one cached COUNT query. The former
  // listAllPublishedProducts() hydration (500 rows + 5 child queries + JSON
  // parsing) is gone from this path.
  const [featuredPage, brands, categories, settings, brandCounts] = await Promise.all([
    listProducts({ sort: "featured", pageSize: 8 }),
    getBrands(),
    getCategories(),
    getSettings(),
    brandItemCounts(),
  ]);

  // Server-side trims — the full catalog stays on the server; the client
  // payload only carries what each section renders (was: the entire
  // catalog serialized into every homepage response).
  const featuredItems = toCardItems(featuredPage.items);

  // The two storefront pillars (TEREA Sticks / IQOS Devices) get their own
  // dedicated showcase section below — keep them out of the generic
  // category grid so they never render twice on the homepage.
  const STORE_COLLECTION_SLUGS = new Set(["terea-sticks", "iqos-devices"]);
  const gridCategories = categories.filter((category) => !STORE_COLLECTION_SLUGS.has(category.slug));

  return (
    <>
      {/* ItemList rich result — mirrors the featured strip rendered below. */}
      <JsonLd data={itemListJsonLd(featuredItems, "Featured TEREA sticks — TereaCOD UAE")} />
      {/* Hero-only smoke textures — React hoists these <link>s to <head>. */}
      <link rel="preload" as="image" href="/smoke/smoke-plume.webp" />
      <link rel="preload" as="image" href="/smoke/smoke-wisps.png" />
      <HeroSection />
      <CollectionPreview CATALOG_ITEMS={featuredItems} />
      {/* Generic collection grid — hidden entirely while the only categories
          are the two pillars showcased right below (empty-catalog state). */}
      {gridCategories.length > 0 && (
        <ProductCategoriesSection CATALOG_CATEGORIES={gridCategories} />
      )}
      {/* The two storefront pillars — TEREA sticks & IQOS devices. */}
      <StoreCollectionsSection />
      <BrandCollectionSection BRANDS={brands} ITEM_COUNTS={brandCounts} />
      {/* Seven TEREA sourcing lines — one crawlable landing page each. */}
      <OriginSection />
      <BrandIntroSection />
      <CompanySection />
      <SupportSection SITE_SETTINGS={settings} />
    </>
  );
}
