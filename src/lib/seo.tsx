import type { CatalogItem } from "@/types";

/**
 * SEO / STRUCTURED-DATA TOOLKIT
 * -----------------------------
 * Central helpers for canonical URL construction and schema.org JSON-LD.
 * Every public route renders its structured data through <JsonLd> so the
 * storefront ships rich results (Organization, WebSite, Product/Offer,
 * BreadcrumbList, FAQPage) without any third-party dependency.
 *
 * The canonical origin mirrors metadataBase in src/app/layout.tsx via
 * SITE_ORIGIN below. Resolution order:
 *  1. NEXT_PUBLIC_SITE_URL — explicit override for any deployment.
 *  2. Production builds default to the live domain, so a missing build-time
 *     variable can never bake `localhost` into robots.txt, the sitemap,
 *     canonicals or JSON-LD (Cloudflare Workers Builds exports no env vars
 *     during `next build` by default).
 *  3. Development falls back to http://localhost:3000.
 */

export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? "https://tereacod.ae" : "http://localhost:3000");

const BASE_URL = SITE_ORIGIN;

/** Absolute URL for a site path — used by canonicals, sitemap and JSON-LD. */
export const siteUrl = (path = "/") => new URL(path, BASE_URL).toString();

/** Absolute asset URL (product images, OG art) for structured data. */
export const siteAssetUrl = (path: string) => new URL(path, BASE_URL).toString();

/* ------------------------------ JSON-LD ------------------------------ */

type JsonLdObject = Record<string, unknown>;

/**
 * Renders one or more schema.org graphs. The `<` escape prevents any
 * user-derived string from closing the script tag early (XSS hardening).
 */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD requires raw script injection; `<` chars are escaped above to block tag breakout.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/** TereaCOD as the operating organisation (footer/contact data). */
export function organizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TereaCOD",
    legalName: "TereaCOD Trading L.L.C.",
    url: siteUrl("/"),
    logo: siteAssetUrl("/logo.svg"),
    description:
      "The UAE's TEREA delivery specialist — authentic TEREA heated tobacco sticks for IQOS ILUMA with transparent AED pricing, age-verified UAE-wide delivery and cash or card on delivery from Dubai.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Level 14, Boulevard Plaza Tower 1, Downtown Dubai",
      addressLocality: "Dubai",
      addressCountry: "AE",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "hello@tereacod.ae",
      telephone: "+971-4-000-0000",
      availableLanguage: ["English", "Arabic"],
      areaServed: "AE",
    },
  };
}

/** WebSite graph with a search action pointing at /search. */
export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TereaCOD",
    alternateName: "TereaCOD — TEREA Delivery UAE",
    url: siteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl("/search")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

const AVAILABILITY_SCHEMA: Record<CatalogItem["availability"], string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
  unavailable: "https://schema.org/Discontinued",
};

/** Product + Offer graph for a catalog listing page. */
export function productJsonLd(item: CatalogItem, brandName?: string): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    description: item.description,
    sku: item.sku,
    ...(item.model ? { mpn: item.model } : {}),
    ...(item.images.length ? { image: item.images.map((src) => siteAssetUrl(src)) } : {}),
    ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
    offers: {
      "@type": "Offer",
      url: siteUrl(`/products/${item.slug}`),
      priceCurrency: "AED",
      price: item.price,
      availability: AVAILABILITY_SCHEMA[item.availability] ?? "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "TereaCOD" },
      ...(item.compareAtPrice !== undefined
        ? { priceValidUntil: new Date(new Date().getFullYear() + 1, 0, 1).toISOString().slice(0, 10) }
        : {}),
    },
  };
}

/** ItemList graph — e.g. the stocked catalog surfaced on the homepage. */
export function itemListJsonLd(items: Array<Pick<CatalogItem, "slug" | "name">>, listName: string): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: siteUrl(`/products/${item.slug}`),
      name: item.name,
    })),
  };
}

export interface CrumbEntry {
  label: string;
  href?: string;
}

/** BreadcrumbList graph — mirror of the visual <Breadcrumbs> trail. */
export function breadcrumbJsonLd(trail: CrumbEntry[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: siteUrl(crumb.href) } : {}),
    })),
  };
}

export interface FaqEntry {
  question: string;
  answer: string;
}

/** FAQPage graph for the help-centre FAQ and any product-level FAQs. */
export function faqJsonLd(faqs: FaqEntry[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/* --------------------------- Canonical URLs --------------------------- */

/**
 * Standard `alternates` block for a canonical page. Sort/filter query
 * params are intentionally dropped so pagination and faceted URLs
 * consolidate onto the canonical listing.
 */
export function canonical(path: string) {
  return { alternates: { canonical: siteUrl(path) } };
}
