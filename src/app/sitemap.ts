import type { MetadataRoute } from "next";
import { allProductSlugs } from "@/server/repos/catalog";
import { getCategories, getBrands } from "@/server/data";
import { ORIGIN_LINES } from "@/lib/catalog-origin";
import { siteUrl } from "@/lib/seo";

/**
 * XML SITEMAP (dynamic — QA audit Task 26).
 * Every indexable public route: static marketing/help/legal pages plus the
 * full live catalog. Products report their real `updated_at`, so admin edits
 * flow into lastmod instead of being masked by a run-time timestamp.
 * Transactional and utility routes (cart, checkout, account, search, saved,
 * admin) are intentionally excluded — noindex via metadata and robots.txt.
 *
 * Computed per request (not prerendered): a build-time prerender would bake
 * an EMPTY catalog (no D1 bindings exist during cf:build — the catch-()
 * fallback masks it) and a stale origin. Crawler traffic is negligible and
 * the queries are indexed, so dynamic cost is trivial.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), lastModified, changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/discover"), lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/collections"), lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: siteUrl("/brand"), lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: siteUrl("/about"), lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: siteUrl("/help"), lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/help/faq"), lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/safety"), lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: siteUrl("/compliance"), lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: siteUrl("/contact"), lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: siteUrl("/legal/terms"), lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: siteUrl("/legal/privacy"), lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: siteUrl("/legal/cookies"), lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: siteUrl("/legal/consumer-information"), lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];

  const [categories, brands] = await Promise.all([getCategories(), getBrands()]);
  const productSlugs = await allProductSlugs().catch(
    (): Array<{ slug: string; updated_at: string }> => []
  );

  const collectionRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: siteUrl(`/collections/${category.slug}`),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const brandRoutes: MetadataRoute.Sitemap = brands.map((brand) => ({
    url: siteUrl(`/brand/${brand.slug}`),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // TEREA origin-line landing pages (duty-free / indonesia / japan).
  const originRoutes: MetadataRoute.Sitemap = ORIGIN_LINES.map((line) => ({
    url: siteUrl(`/origin/${line.slug}`),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = productSlugs.map((product) => ({
    url: siteUrl(`/products/${product.slug}`),
    lastModified: new Date(product.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...collectionRoutes, ...brandRoutes, ...originRoutes, ...productRoutes];
}
