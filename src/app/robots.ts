import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

/**
 * ROBOTS.TXT (Next.js Metadata API)
 * ---------------------------------
 * Generated at the site origin (env-driven, never hardcoded) so the
 * Sitemap line is always absolute and correct for the deployment.
 *
 * Indexing policy: the storefront is crawlable; the admin console and
 * transactional/utility routes are disallowed and additionally carry
 * noindex metadata in their route layouts.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/cart", "/checkout", "/saved", "/account", "/categories", "/api/"],
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
  };
}
