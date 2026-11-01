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
import { getBrands, getCategories, getProducts, getSettings } from "@/server/data";
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
  const [products, brands, categories, settings] = await Promise.all([
    getProducts(),
    getBrands(),
    getCategories(),
    getSettings(),
  ]);

  // Server-side trims — the full catalog stays on the server; the client
  // payload only carries what each section renders (was: the entire
  // catalog serialized into every homepage response).
  const featuredItems = toCardItems(products.filter((item) => item.featured).slice(0, 8));
  const itemCounts = products.reduce<Record<string, number>>((acc, item) => {
    acc[item.brand] = (acc[item.brand] ?? 0) + 1;
    return acc;
  }, {});

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
      <BrandCollectionSection BRANDS={brands} ITEM_COUNTS={itemCounts} />
      <DiscoverSection />
      <BrandIntroSection />
      <CompanySection />
      <SafetySection />
      <SupportSection SITE_SETTINGS={settings} />
    </>
  );
}
