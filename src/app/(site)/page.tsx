import type { Metadata } from "next";
import { BrandCollectionSection } from "@/components/homepage/brand-collection-section";
import { BrandIntroSection } from "@/components/homepage/brand-intro-section";
import { CollectionPreview } from "@/components/homepage/collection-preview";
import { CompanySection } from "@/components/homepage/company-section";
import { DiscoverSection } from "@/components/homepage/discover-section";
import { HeroSection } from "@/components/homepage/hero-section";
import { ProductCategoriesSection } from "@/components/homepage/product-categories-section";
import { SafetySection } from "@/components/homepage/safety-section";
import { SupportSection } from "@/components/homepage/support-section";
import { getBrands, getCategories, getSettings } from "@/server/data";
import { brandItemCounts, listProducts } from "@/server/repos/catalog";
import { toCardItems } from "@/lib/catalog-card";
import { canonical, itemListJsonLd, JsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "TEREA Delivery UAE | Buy TEREA Sticks Online — Cash & Card on Delivery",
  description:
    "Order TEREA sticks online in the UAE from TereaCOD — TEREA delivery UAE-wide with same-day dispatch from Dubai. Authentic IQOS TEREA heated tobacco sticks across Amber, Black Menthol, multi-origin, Indonesia and Japan lines, priced in AED and paid by cash or card on delivery.",
  ...canonical("/"),
};

/**
 * Homepage — electric section flow:
 * hero → products → categories → brand collection → discover →
 * the brand → company facts → compliance band → support.
 * Shell chrome (header, footer, bottom nav, ambient smoke) comes from
 * the (site) layout.
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

  return (
    <>
      {/* ItemList rich result — mirrors the featured strip rendered below. */}
      <JsonLd data={itemListJsonLd(featuredItems, "Featured TEREA sticks — TereaCOD UAE")} />
      {/* Hero-only smoke textures — React hoists these <link>s to <head>. */}
      <link rel="preload" as="image" href="/smoke/smoke-plume.webp" />
      <link rel="preload" as="image" href="/smoke/smoke-column.webp" />
      <HeroSection />
      <CollectionPreview CATALOG_ITEMS={featuredItems} />
      <ProductCategoriesSection CATALOG_CATEGORIES={categories} />
      <BrandCollectionSection BRANDS={brands} ITEM_COUNTS={brandCounts} />
      <DiscoverSection />
      <BrandIntroSection />
      <CompanySection />
      <SafetySection />
      <SupportSection SITE_SETTINGS={settings} />
    </>
  );
}
