import type { CatalogItem } from "@/types";

/**
 * CATALOG ORIGIN LINES
 * -------------------
 * Every TEREA stick in the catalog belongs to one of three sourcing
 * (origin) lines. These constants are the single source of truth for:
 *
 *  - the origin filter chips on listing pages (discover, collections, brand)
 *  - the dedicated SEO landing pages at /origin/<slug>
 *  - the server-side origin filter on /api/v1/catalog/products (`origin=slug`)
 *
 * `dbValue` must match the product `origin` column exactly (the origin is
 * chosen per product in the admin console — the catalog is authored after
 * go-live and is no longer seeded).
 */

export interface OriginLine {
  /** URL segment — /origin/<slug>. */
  slug: string;
  /** Display name on chips, headings and cards. */
  label: string;
  /** Compact chip label (multi line reads better shortened). */
  chipLabel: string;
  /** Exact product `origin` column value this line maps to. */
  dbValue: string;
  /** Hero lead for the origin landing page. */
  intro: string;
  /** <title> for the origin landing page. */
  metaTitle: string;
  /** Meta description for the origin landing page. */
  metaDescription: string;
  /** Targeted keyword list for the origin landing page metadata. */
  keywords: string[];
  /** Below-the-fold SEO content blocks (headings + paragraphs). */
  seoBlocks: Array<{ heading: string; paragraphs: string[] }>;
}

export const ORIGIN_LINES: readonly OriginLine[] = [
  {
    slug: "duty-free",
    label: "Duty Free (Multi-Origin)",
    chipLabel: "Duty Free (Multi)",
    dbValue: "Uzbekistan, Tajikistan, Kazakhstan, Indonesia & Duty Free",
    intro:
      "The multi-origin duty-free line — the widest TEREA flavour spread in one place, from smooth Amber and Yellow toasted tobaccos to Wave menthols and click-capsule Pearl editions, delivered anywhere in the UAE.",
    metaTitle: "TEREA Duty Free Sticks UAE — Multi-Origin Delivery | TereaCOD",
    metaDescription:
      "Shop TEREA Duty Free multi-origin sticks in the UAE — Amber, Purple Wave, Twilight Pearl and more. AED 45 a pack, cash or card on delivery, UAE-wide from Dubai.",
    keywords: [
      "terea duty free uae",
      "terea multi origin sticks",
      "terea delivery uae",
      "terea cash on delivery dubai",
      "buy terea duty free online uae",
    ],
    seoBlocks: [
      {
        heading: "TEREA Duty Free delivery anywhere in the UAE",
        paragraphs: [
          "The duty-free multi-origin line is the most varied TEREA range on the shelf — every stick in this line is imported through duty-free channels across Uzbekistan, Tajikistan, Kazakhstan, Indonesia and the wider duty-free network. TereaCOD keeps the full line in stock in Dubai and delivers it to every emirate: Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain and Al Ain.",
          "Order before the daily cut-off and your packs are dispatched the same day with cash on delivery or card on delivery at the door — no prepayment, no card fees and no surprises. Pricing is transparent at AED 45 per pack of 20 sticks, with the multi-origin option priced at zero premium because it is the line the rest of the range is measured against.",
        ],
      },
      {
        heading: "What is the TEREA multi-origin line?",
        paragraphs: [
          "TEREA sticks are heat-not-burn tobacco sticks made exclusively for IQOS ILUMA devices — the tobacco is heated by induction, never burned. The multi-origin duty-free line bundles the classic flavour families: smooth toasted tobaccos (Amber, Silver, Yellow), fruity menthol Waves (Purple Wave, Zing Wave, Summer Wave, Turquoise) and the click-capsule Pearl editions (Twilight Pearl, Starling Pearl, Tidal Pearl, Province Pearl) that release a burst of cooling flavour when the capsule is crushed.",
          "Every listing on TereaCOD states its origin line on the product page and on the shelf, so you always know which sourcing line your sticks come from before you order. Browse the full shelf in the heat-not-burn collection, or compare the Indonesia and Japan origin lines side by side.",
        ],
      },
    ],
  },
  {
    slug: "indonesia",
    label: "Indonesia",
    chipLabel: "Indonesia",
    dbValue: "Indonesia",
    intro:
      "TEREA sticks sourced from Indonesia — Dimension Series rarities like Yugen and Apprecity, Golden Edition, Oasis Pearl and Sun Pearl, all delivered across the UAE with cash or card on delivery.",
    metaTitle: "TEREA Indonesia Sticks UAE — Delivery + Cash on Delivery | TereaCOD",
    metaDescription:
      "Buy TEREA Indonesia origin sticks in the UAE — Yugen, Apprecity, Golden Edition, Oasis Pearl and more. AED 48 a pack, same-day dispatch from Dubai, cash or card on delivery.",
    keywords: [
      "terea indonesia uae",
      "terea indonesia delivery dubai",
      "terea yugen uae",
      "terea cash on delivery",
      "buy terea indonesia online uae",
    ],
    seoBlocks: [
      {
        heading: "TEREA Indonesia delivery across Dubai and the UAE",
        paragraphs: [
          "The Indonesia sourcing line carries some of the most requested TEREA editions in the region — the Dimension Series pair Yugen and Apprecity, the mellow Golden Edition, and Pearl editions like Oasis Pearl Indonesia and Sun Pearl Indonesia. TereaCOD stocks the complete Indonesia line in Dubai and delivers to every emirate with cash or card on delivery.",
          "Indonesia-origin sticks carry a small import premium of AED 3 over the multi-origin line (AED 48 per pack of 20) — the delta is shown on every listing and applied at checkout, never at the door. Same-day dispatch is available for orders placed before the daily cut-off, and every pack ships sealed exactly as it left the factory.",
        ],
      },
      {
        heading: "TEREA Indonesia flavours explained",
        paragraphs: [
          "The Indonesian range leans richer and fruitier than the other lines. Sienna and Bronze deliver deep, woody tobacco with cocoa and dried-fruit notes, Black Green is bold and earthy, while Bright Wave, Purple Wave Indonesia, Blue and Green cover the menthol and cooling spectrum. The Dimension Series — Yugen with its rich floral tobacco and Apprecity with creamy tobacco — is exclusive to this line.",
          "Pearl editions add a click-capsule: crush the capsule and the filter releases a tropical, juicy aroma (Oasis Pearl) or a refined exotic-fruit burst (Sun Pearl). If you are deciding between lines, the Indonesia line is the sweet spot between the wide duty-free range and the Japan line's menthol focus — and you can switch lines anytime with the origin filter on any listing page.",
        ],
      },
    ],
  },
  {
    slug: "japan",
    label: "Japan",
    chipLabel: "Japan",
    dbValue: "Japan",
    intro:
      "TEREA sticks sourced from Japan — the menthol benchmark: Black Menthol, Purple Menthol, the Regular family and Japan-only Pearl editions, delivered UAE-wide with cash or card on delivery.",
    metaTitle: "TEREA Japan Sticks UAE — Japan Line Delivery | TereaCOD",
    metaDescription:
      "Shop TEREA Japan origin sticks in the UAE — Black Menthol, Purple Menthol, Rich Regular, Smooth Regular and more. AED 50 a pack, UAE-wide delivery, cash or card on delivery.",
    keywords: [
      "terea japan uae",
      "terea japan delivery dubai",
      "terea black menthol uae",
      "terea japan cash on delivery",
      "buy terea japan sticks online uae",
    ],
    seoBlocks: [
      {
        heading: "TEREA Japan delivery in Dubai, Abu Dhabi and beyond",
        paragraphs: [
          "The Japan line is the benchmark TEREA range for menthol smokers — Black Menthol's strong cold hit, Purple Menthol's classic style, and the full Regular family (Rich, Regular, Smooth, Balance and Warm) for non-menthol smokers. TereaCOD imports the Japan line directly, keeps it sealed in the Dubai warehouse and delivers it across the UAE with cash or card on delivery.",
          "Japan-origin sticks carry a AED 5 import premium over the multi-origin line (AED 50 per pack of 20) — the delta is displayed on every listing and confirmed at checkout before dispatch. Orders placed before the daily cut-off leave the warehouse the same day, and packs arrive factory-sealed with the Japanese market markings intact.",
        ],
      },
      {
        heading: "Why the TEREA Japan line is different",
        paragraphs: [
          "Japanese-market TEREA sticks are tuned for a cleaner, colder draw: the menthol editions run stronger than their duty-free counterparts, and the Pearl editions — Oasis Pearl Japan and Sun Pearl Japan — add a click-capsule cooling burst on top of the refined menthol base. Black Purple Menthol layers forest-berry notes over a frosty menthol, while Mint and Menthol cover the classic styles.",
          "The Regular family is where the line earns its reputation: Rich Regular for full-bodied tobacco, Smooth Regular for a mild draw, Balance Regular for an even middle ground and Warm Regular for a toasted finish. Use the origin filter on any listing page to compare the Japan line against the duty-free and Indonesia lines, and mix lines freely in one order — delivery pricing stays the same.",
        ],
      },
    ],
  },
] as const;

/** All origin line slugs — used for static params and sitemap. */
export const ORIGIN_LINE_SLUGS: readonly string[] = ORIGIN_LINES.map((line) => line.slug);

/** Resolve an origin line by its URL slug. */
export function originLineBySlug(slug: string): OriginLine | null {
  return ORIGIN_LINES.find((line) => line.slug === slug) ?? null;
}

/** Map a product's `origin` value to its origin line (null when unknown). */
export function originLineForItem(item: Pick<CatalogItem, "origin">): OriginLine | null {
  if (!item.origin) return null;
  return ORIGIN_LINES.find((line) => line.dbValue === item.origin) ?? null;
}

/** Map a product's `origin` value to the line slug (null when unknown). */
export function originSlugForItem(item: Pick<CatalogItem, "origin">): string | null {
  return originLineForItem(item)?.slug ?? null;
}

/** Count products per origin line slug (plus "all") for filter chips. */
export function originCountsFor(items: Array<Pick<CatalogItem, "origin">>): Record<string, number> {
  const counts: Record<string, number> = { all: items.length };
  for (const line of ORIGIN_LINES) counts[line.slug] = 0;
  for (const item of items) {
    const slug = originSlugForItem(item);
    if (slug) counts[slug] = (counts[slug] ?? 0) + 1;
  }
  return counts;
}
