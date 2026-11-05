import type { CatalogItem } from "@/types";

/**
 * CATALOG ORIGIN LINES
 * -------------------
 * Every TEREA stick in the catalog belongs to one of seven sourcing
 * (origin) lines. These constants are the single source of truth for:
 *
 *  - the origin filter chips on listing pages (discover, collections, brand, search)
 *  - the dedicated SEO landing pages at /origin/<slug>
 *  - the homepage "Shop by origin" section
 *  - the admin product origin dropdown (add / edit product)
 *  - the server-side origin filter on /api/v1/catalog/products (`origin=slug`)
 *
 * `dbValue` must match the product `origin` column exactly (the origin is
 * chosen per product from a dropdown in the admin console — the catalog is
 * authored after go-live and is no longer seeded).
 */

export interface OriginLine {
  /** URL segment — /origin/<slug>. */
  slug: string;
  /** Display name on chips, headings and cards. */
  label: string;
  /** Compact chip label (multi line reads better shortened). */
  chipLabel: string;
  /** Flag emoji shown on chips, cards and the homepage origin grid. */
  flag: string;
  /** Exact product `origin` column value this line maps to. */
  dbValue: string;
  /** One-line blurb for the homepage origin card grid. */
  cardBlurb: string;
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
    slug: "uzbekistan",
    label: "Uzbekistan",
    chipLabel: "Uzbekistan",
    flag: "🇺🇿",
    dbValue: "Uzbekistan",
    cardBlurb: "Smooth toasted tobaccos and balanced Amber lines sourced from Uzbekistan.",
    intro:
      "TEREA sticks sourced from Uzbekistan — smooth toasted tobaccos, balanced Amber lines and the dependable everyday range, delivered anywhere in the UAE with cash or card on delivery.",
    metaTitle: "TEREA Uzbekistan Sticks UAE — Delivery + Cash on Delivery | TereaCOD",
    metaDescription:
      "Buy TEREA Uzbekistan origin sticks in the UAE — smooth toasted tobacco and Amber lines. Same-day dispatch from Dubai, cash or card on delivery.",
    keywords: [
      "terea uzbekistan uae",
      "terea uzbekistan delivery dubai",
      "terea amber uzbekistan uae",
      "terea cash on delivery",
      "buy terea uzbekistan online uae",
    ],
    seoBlocks: [
      {
        heading: "TEREA Uzbekistan delivery across Dubai and the UAE",
        paragraphs: [
          "The Uzbekistan sourcing line carries the smooth, easy-going side of the TEREA range — classic toasted tobaccos and balanced Amber editions that suit an all-day heat-not-burn routine. TereaCOD keeps the Uzbekistan line stocked in the Dubai warehouse and delivers to every emirate: Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain and Al Ain.",
          "Orders placed before the daily cut-off are dispatched the same day, and every pack arrives factory-sealed with AED pricing shown up front — cash or card on delivery at the door, never any prepayment.",
        ],
      },
      {
        heading: "Why choose the Uzbekistan line",
        paragraphs: [
          "Uzbekistan-origin TEREA sticks are prized for their consistency: a clean toasted-tobacco base with a mellow draw that makes them the everyday workhorse of the range. If you are new to TEREA or simply want a dependable stick without menthol or capsule flourishes, this is the line to start with.",
          "Every listing states its origin on the shelf and the product page, so you always know which sourcing line your sticks come from before you order. Compare against the other origin lines with the filter on any listing page.",
        ],
      },
    ],
  },
  {
    slug: "tajikistan",
    label: "Tajikistan",
    chipLabel: "Tajikistan",
    flag: "🇹🇯",
    dbValue: "Tajikistan",
    cardBlurb: "Rich, deep toasted-tobacco editions sourced from Tajikistan.",
    intro:
      "TEREA sticks sourced from Tajikistan — rich, deep toasted-tobacco editions with a fuller draw, delivered UAE-wide from Dubai with cash or card on delivery.",
    metaTitle: "TEREA Tajikistan Sticks UAE — Delivery + Cash on Delivery | TereaCOD",
    metaDescription:
      "Shop TEREA Tajikistan origin sticks in the UAE — rich toasted tobacco editions. AED pricing, same-day dispatch from Dubai, cash or card on delivery.",
    keywords: [
      "terea tajikistan uae",
      "terea tajikistan delivery dubai",
      "terea toasted tobacco uae",
      "terea cash on delivery",
      "buy terea tajikistan online uae",
    ],
    seoBlocks: [
      {
        heading: "TEREA Tajikistan delivery anywhere in the UAE",
        paragraphs: [
          "The Tajikistan line is where the TEREA range leans richer and deeper — toasted-tobacco editions with a fuller, more pronounced draw for smokers who want more body from every heat stick. TereaCOD stocks the Tajikistan line in Dubai and delivers it to all seven Emirates with cash or card on delivery.",
          "Pricing is transparent in AED on every listing, with any origin premium shown before checkout rather than added at the door. Same-day dispatch applies to orders placed before the daily cut-off.",
        ],
      },
      {
        heading: "The Tajikistan flavour profile",
        paragraphs: [
          "Tajikistan-origin sticks focus on the classic heated-tobacco experience: deep, woody tobacco with subtle cocoa and dried-fruit notes and a consistent induction heat from the first to the last puff. They pair perfectly with the IQOS ILUMA's Smartcore induction heating.",
          "Use the origin filter on any listing page to compare the Tajikistan line against Uzbekistan, Indonesia, Japan and the rest of the range — and mix lines freely in one order, delivery pricing stays the same.",
        ],
      },
    ],
  },
  {
    slug: "kyrgyzstan",
    label: "Kyrgyzstan",
    chipLabel: "Kyrgyzstan",
    flag: "🇰🇬",
    dbValue: "Kyrgyzstan",
    cardBlurb: "Crisp menthol and cooling editions sourced from Kyrgyzstan.",
    intro:
      "TEREA sticks sourced from Kyrgyzstan — crisp menthol and cooling editions with a clean, frosty draw, delivered UAE-wide with cash or card on delivery.",
    metaTitle: "TEREA Kyrgyzstan Sticks UAE — Delivery + Cash on Delivery | TereaCOD",
    metaDescription:
      "Buy TEREA Kyrgyzstan origin sticks in the UAE — crisp menthol and cooling editions. Same-day dispatch from Dubai, cash or card on delivery.",
    keywords: [
      "terea kyrgyzstan uae",
      "terea kyrgyzstan delivery dubai",
      "terea menthol kyrgyzstan uae",
      "terea cash on delivery",
      "buy terea kyrgyzstan online uae",
    ],
    seoBlocks: [
      {
        heading: "TEREA Kyrgyzstan delivery in Dubai, Abu Dhabi and beyond",
        paragraphs: [
          "The Kyrgyzstan sourcing line covers the crisp, cooling side of the TEREA range — menthol-forward editions with a clean frosty draw that stays consistent pack after pack. TereaCOD imports the Kyrgyzstan line directly, keeps it sealed in the Dubai warehouse and delivers it across the UAE.",
          "Orders placed before the daily cut-off leave the warehouse the same day, and packs arrive factory-sealed with AED pricing confirmed at checkout — never added at the door.",
        ],
      },
      {
        heading: "Why the Kyrgyzstan line works for menthol smokers",
        paragraphs: [
          "Kyrgyzstan-origin TEREA sticks are tuned for a colder, cleaner draw: the menthol runs bright without overpowering the toasted-tobacco base, making the line an easy daily choice for menthol smokers. Cooling editions layer gentle freshness over the classic profile for those who want less intensity.",
          "Compare the Kyrgyzstan line against the Japan menthol benchmark with the origin filter on any listing page, and switch lines anytime — one order can carry every origin you like.",
        ],
      },
    ],
  },
  {
    slug: "indonesia",
    label: "Indonesia",
    chipLabel: "Indonesia",
    flag: "🇮🇩",
    dbValue: "Indonesia",
    cardBlurb: "Dimension Series rarities, Golden Edition and tropical Pearl editions.",
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
          "Indonesia-origin sticks carry a small import premium over the standard lines — the delta is shown on every listing and applied at checkout, never at the door. Same-day dispatch is available for orders placed before the daily cut-off, and every pack ships sealed exactly as it left the factory.",
        ],
      },
      {
        heading: "TEREA Indonesia flavours explained",
        paragraphs: [
          "The Indonesian range leans richer and fruitier than the other lines. Sienna and Bronze deliver deep, woody tobacco with cocoa and dried-fruit notes, Black Green is bold and earthy, while Bright Wave, Purple Wave Indonesia, Blue and Green cover the menthol and cooling spectrum. The Dimension Series — Yugen with its rich floral tobacco and Apprecity with creamy tobacco — is exclusive to this line.",
          "Pearl editions add a click-capsule: crush the capsule and the filter releases a tropical, juicy aroma (Oasis Pearl) or a refined exotic-fruit burst (Sun Pearl). If you are deciding between lines, the Indonesia line is the sweet spot between the classic toasted tobaccos and the Japan line's menthol focus — and you can switch lines anytime with the origin filter on any listing page.",
        ],
      },
    ],
  },
  {
    slug: "switzerland-duty-free",
    label: "Switzerland (Duty Free)",
    chipLabel: "Switzerland (Duty Free)",
    flag: "🇨🇭",
    dbValue: "Switzerland (Duty Free)",
    cardBlurb: "The widest flavour spread — Waves, Pearls and classics via Swiss duty-free.",
    intro:
      "TEREA sticks sourced through Swiss duty-free channels — the widest flavour spread in one place, from smooth Amber and Yellow toasted tobaccos to Wave menthols and click-capsule Pearl editions, delivered anywhere in the UAE.",
    metaTitle: "TEREA Switzerland Duty Free Sticks UAE — Delivery | TereaCOD",
    metaDescription:
      "Shop TEREA Switzerland (Duty Free) sticks in the UAE — Amber, Purple Wave, Twilight Pearl and more. Cash or card on delivery, UAE-wide from Dubai.",
    keywords: [
      "terea switzerland duty free uae",
      "terea duty free switzerland uae",
      "terea multi origin sticks",
      "terea delivery uae",
      "buy terea duty free online uae",
    ],
    seoBlocks: [
      {
        heading: "TEREA Switzerland (Duty Free) delivery anywhere in the UAE",
        paragraphs: [
          "The Swiss duty-free line is the most varied TEREA range on the shelf — every stick in this line is imported through duty-free channels in Switzerland. TereaCOD keeps the full line in stock in Dubai and delivers it to every emirate: Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain and Al Ain.",
          "Order before the daily cut-off and your packs are dispatched the same day with cash on delivery or card on delivery at the door — no prepayment, no card fees and no surprises. Pricing is transparent per pack of 20 sticks, with the duty-free line priced at zero premium because it is the line the rest of the range is measured against.",
        ],
      },
      {
        heading: "What is the TEREA Switzerland (Duty Free) line?",
        paragraphs: [
          "TEREA sticks are heat-not-burn tobacco sticks made exclusively for IQOS ILUMA devices — the tobacco is heated by induction, never burned. The Swiss duty-free line bundles the classic flavour families: smooth toasted tobaccos (Amber, Silver, Yellow), fruity menthol Waves (Purple Wave, Zing Wave, Summer Wave, Turquoise) and the click-capsule Pearl editions (Twilight Pearl, Starling Pearl, Tidal Pearl, Province Pearl) that release a burst of cooling flavour when the capsule is crushed.",
          "Every listing on TereaCOD states its origin line on the product page and on the shelf, so you always know which sourcing line your sticks come from before you order. Compare the other origin lines side by side with the origin filter on any listing page.",
        ],
      },
    ],
  },
  {
    slug: "japan",
    label: "Japan",
    chipLabel: "Japan",
    flag: "🇯🇵",
    dbValue: "Japan",
    cardBlurb: "The menthol benchmark — Black Menthol, Purple Menthol and the Regular family.",
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
          "Japan-origin sticks carry a small import premium over the standard lines — the delta is displayed on every listing and confirmed at checkout before dispatch. Orders placed before the daily cut-off leave the warehouse the same day, and packs arrive factory-sealed with the Japanese market markings intact.",
        ],
      },
      {
        heading: "Why the TEREA Japan line is different",
        paragraphs: [
          "Japanese-market TEREA sticks are tuned for a cleaner, colder draw: the menthol editions run stronger than their duty-free counterparts, and the Pearl editions — Oasis Pearl Japan and Sun Pearl Japan — add a click-capsule cooling burst on top of the refined menthol base. Black Purple Menthol layers forest-berry notes over a frosty menthol, while Mint and Menthol cover the classic styles.",
          "The Regular family is where the line earns its reputation: Rich Regular for full-bodied tobacco, Smooth Regular for a mild draw, Balance Regular for an even middle ground and Warm Regular for a toasted finish. Use the origin filter on any listing page to compare the Japan line against the others, and mix lines freely in one order — delivery pricing stays the same.",
        ],
      },
    ],
  },
  {
    slug: "italy",
    label: "Italy",
    chipLabel: "Italy",
    flag: "🇮🇹",
    dbValue: "Italy",
    cardBlurb: "European-market classics with a refined, balanced draw.",
    intro:
      "TEREA sticks sourced from Italy — European-market classics with a refined, balanced draw, delivered across the UAE with cash or card on delivery.",
    metaTitle: "TEREA Italy Sticks UAE — Italy Line Delivery | TereaCOD",
    metaDescription:
      "Buy TEREA Italy origin sticks in the UAE — refined European-market classics. AED pricing, same-day dispatch from Dubai, cash or card on delivery.",
    keywords: [
      "terea italy uae",
      "terea italy delivery dubai",
      "terea europe sticks uae",
      "terea cash on delivery",
      "buy terea italy online uae",
    ],
    seoBlocks: [
      {
        heading: "TEREA Italy delivery across the UAE",
        paragraphs: [
          "The Italy sourcing line brings the European-market TEREA range to the UAE — refined, balanced editions with the clean draw European smokers expect. TereaCOD keeps the Italy line stocked in Dubai and delivers to every emirate with cash or card on delivery.",
          "Every listing shows its origin and AED price up front, any origin premium is applied at checkout (never at the door), and orders placed before the daily cut-off are dispatched the same day.",
        ],
      },
      {
        heading: "The Italian line at a glance",
        paragraphs: [
          "Italy-origin TEREA sticks focus on balance: a smooth toasted-tobacco core with restrained menthol options and a consistently even heat curve. They are an easy recommendation for smokers who found the stronger menthol lines too intense but still want a touch of freshness.",
          "Compare the Italy line against Uzbekistan, Japan and the duty-free range with the origin filter on any listing page — mixing lines in one order never changes the delivery price.",
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

/**
 * Origin sources — the two places a listing carries origins:
 *
 *  1. `origin`        — the product-level sourcing line (admin Details
 *                       dropdown → products.origin column)
 *  2. origin variants — product_variants rows with type="origin" (multi-
 *                       origin listings ship one variant per sourcing
 *                       line, each with its own premium/photo)
 *
 * A listing may carry BOTH (product line + per-origin variants) and a
 * multi-origin listing belongs under EVERY line it stocks — the filters
 * are facets, not buckets. Full CatalogItem (variants) and the compact
 * CatalogCardItem projection (variantOrigins) both satisfy this shape.
 */
export interface OriginResolvable {
  origin?: string | null;
  /** Origin-type variant labels (full CatalogItem carries its variants). */
  variants?: Array<{ type: string; label: string }>;
  /** Card projection — origin-type variant labels only. */
  variantOrigins?: string[];
}

/**
 * Map one origin label (product column value, variant label, legacy
 * composite string) to its origin line (null when unknown).
 *
 * Exact `dbValue` match first; legacy catalogs authored before the
 * seven-line origin system stored composite strings (e.g. "Uzbekistan,
 * Tajikistan, Kazakhstan, Indonesia & Duty Free") — those fall back to a
 * keyword match so existing shelves keep their origin chips and filters.
 */
function originLineForLabel(label: string): OriginLine | null {
  const exact = ORIGIN_LINES.find((line) => line.dbValue === label);
  if (exact) return exact;

  const value = label.toLowerCase();
  if (value.includes("duty free")) return originLineBySlug("switzerland-duty-free");
  if (value.includes("japan")) return originLineBySlug("japan");
  if (value.includes("indonesia")) return originLineBySlug("indonesia");
  if (value.includes("uzbekistan")) return originLineBySlug("uzbekistan");
  if (value.includes("tajikistan")) return originLineBySlug("tajikistan");
  if (value.includes("kyrgyzstan")) return originLineBySlug("kyrgyzstan");
  if (value.includes("italy")) return originLineBySlug("italy");
  return null;
}

/**
 * EVERY origin line a listing belongs to — product-level origin first,
 * then each origin-type variant. Multi-origin listings (Japan + Italy
 * variants) resolve to [japan, italy] so they surface under both
 * filters and on both landing pages.
 */
export function originLinesForItem(item: OriginResolvable): OriginLine[] {
  const lines = new Map<string, OriginLine>();
  const consider = (label?: string | null) => {
    if (!label) return;
    const line = originLineForLabel(label);
    if (line) lines.set(line.slug, line);
  };
  consider(item.origin);
  if (item.variants) for (const variant of item.variants) if (variant.type === "origin") consider(variant.label);
  if (item.variantOrigins) for (const label of item.variantOrigins) consider(label);
  return [...lines.values()];
}

/** All origin line slugs the listing belongs to (multi-origin safe). */
export function originSlugsForItem(item: OriginResolvable): string[] {
  return originLinesForItem(item).map((line) => line.slug);
}

/**
 * The SINGLE line shown on chips/cards: the product-level origin when
 * set, otherwise the first origin-type variant. A multi-origin listing
 * displays its first line everywhere and still filters under all of them.
 */
export function originLineForItem(item: OriginResolvable): OriginLine | null {
  const productLine = item.origin ? originLineForLabel(item.origin) : null;
  if (productLine) return productLine;
  return originLinesForItem(item)[0] ?? null;
}

/**
 * Count products per origin line slug for filter chips (facet counts —
 * a multi-origin listing counts toward EVERY line it stocks, so the
 * line counts may add up to more than the "all" total).
 */
export function originCountsFor(items: OriginResolvable[]): Record<string, number> {
  const counts: Record<string, number> = { all: items.length };
  for (const line of ORIGIN_LINES) counts[line.slug] = 0;
  for (const item of items) {
    for (const line of originLinesForItem(item)) {
      counts[line.slug] = (counts[line.slug] ?? 0) + 1;
    }
  }
  return counts;
}

// ---------------------------------------------------------------------------
// ORIGIN CHIP (product detail page)
// ---------------------------------------------------------------------------

/**
 * Compact, serializable origin chip descriptor. Deliberately carries ONLY
 * the chip-rendering fields (slug/label/flag) — the full OriginLine shape
 * embeds kilobytes of SEO copy per line, and this data crosses the
 * server→client boundary on every product page.
 */
export interface OriginChipOption {
  slug: string;
  label: string;
  flag: string;
}

/**
 * Everything the product page's reactive origin chip needs:
 *
 *  - `defaultOption` — what the chip shows when no origin variant is
 *    selected: the product-level (Details) line, falling back to the first
 *    origin-variant line when the Details origin is unset. Mirrors
 *    `originLineForItem` semantics.
 *  - `byVariantId` — selected origin variant id → the line it represents,
 *    so the chip follows the Origin pill the visitor picks (a Japan/Italy
 *    listing shows Italy's chip the moment Italy is selected).
 *
 * Variants whose label does not resolve to a known line are simply absent
 * from `byVariantId` — the chip falls back to `defaultOption` for them.
 */
export interface OriginChipData {
  defaultOption: OriginChipOption | null;
  byVariantId: Record<string, OriginChipOption>;
}

/** Build the reactive chip payload for one product (server side). */
export function originChipDataForItem(item: {
  origin?: string | null;
  variants?: Array<{ id: string; type: string; label: string }>;
}): OriginChipData {
  const toOption = (line: OriginLine): OriginChipOption => ({
    slug: line.slug,
    label: line.label,
    flag: line.flag,
  });

  const byVariantId: Record<string, OriginChipOption> = {};
  let firstVariantLine: OriginLine | null = null;
  for (const variant of item.variants ?? []) {
    if (variant.type !== "origin") continue;
    const line = originLineForLabel(variant.label);
    if (!line) continue;
    byVariantId[variant.id] = toOption(line);
    if (!firstVariantLine) firstVariantLine = line;
  }

  const productLine = item.origin ? originLineForLabel(item.origin) : null;
  const defaultLine = productLine ?? firstVariantLine;
  return {
    defaultOption: defaultLine ? toOption(defaultLine) : null,
    byVariantId,
  };
}
