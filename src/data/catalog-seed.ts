/**
 * TereaCOD — STOREFRONT CATALOG SEED DATA.
 *
 * The starter catalog that `bun run db:seed` writes to a fresh database
 * (the runtime store keeps its admin-authored catalog untouched — the
 * seed only ever INSERT-OR-IGNOREs these stable rows). 18 launch listings
 * across both storefront collections:
 *
 *   • TEREA Sticks  — 15 heat-not-burn stick editions spanning all seven
 *     sourcing lines (Uzbekistan, Tajikistan→demo-only, Kyrgyzstan, Indonesia,
 *     Switzerland Duty Free, Japan, Italy) and every flavour family: toasted
 *     tobaccos, menthols, Waves, and click-capsule Pearl editions. Purple
 *     Wave ships as a multi-origin listing (three origin variants) so the
 *     origin picker, per-origin pricing and origin search all demo live.
 *   • IQOS Devices  — the ILUMA hardware line (One / Standard / Prime),
 *     Prime carrying colour variants with swatches.
 *
 * SEARCH CONTEXT: every product carries an explicit `keywords` list — the
 * synonyms, flavour families and origin names a visitor types that never
 * appear in the title ("berries", "freezing", "duty free"). These merge
 * with variant labels + origin + category + SKU through
 * composeSearchKeywords() at seed time, so FTS search is contextual from
 * the first boot, not just for admin-authored listings.
 *
 * Slugs/ids are STABLE (prd_seed_*, brand_seed_*) — re-seeding never
 * duplicates and INSERT OR IGNORE preserves any admin edits made at
 * runtime (prices, copy, stock). Images reference the committed
 * /products/*.jpg placeholder photography.
 */

export interface CatalogSeedBrand {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  blurb: string;
  description: string;
  origin: string;
  established: string;
  accent: string;
  featured: boolean;
  position: number;
}

export interface CatalogSeedSpec {
  title: string;
  entries: Array<{ label: string; value: string }>;
}

export interface CatalogSeedProduct {
  id: string;
  slug: string;
  name: string;
  sku: string;
  model?: string;
  /** Brand slug — resolves to CATALOG_SEED_BRANDS at seed time. */
  brand: string;
  /** Category slug — resolves against the store categories at seed time. */
  category: string;
  tagline: string;
  description: string;
  /** Price in fils (AED × 100) — money stays in fils end-to-end. */
  priceFils: number;
  compareAtFils?: number;
  featured?: boolean;
  isNew?: boolean;
  nicotine?: string;
  /** Product-level sourcing line — exact origin-line dbValue. */
  origin?: string;
  /** Searchable synonyms: flavours, origins, LSI terms beyond the title. */
  keywords: string[];
  /** Public image paths under /products. */
  images: string[];
  originVariants?: Array<{ label: string; deltaFils: number }>;
  colorVariants?: Array<{ label: string; swatch: string; deltaFils?: number }>;
  specs: CatalogSeedSpec[];
  faqs?: Array<{ question: string; answer: string }>;
  rating?: { value: number; count: number };
  /** Related product slugs (rendered as "Related products"). */
  related: string[];
}

export const CATALOG_SEED_BRANDS: CatalogSeedBrand[] = [
  {
    id: "brand_seed_terea",
    slug: "terea",
    name: "TEREA",
    tagline: "Heat-not-burn tobacco sticks made exclusively for IQOS ILUMA.",
    blurb: "The complete TEREA range — toasted tobaccos, menthols, Waves and Pearl editions across every sourcing line.",
    description:
      "TEREA is the heat-not-burn tobacco stick range designed for the IQOS ILUMA system: the tobacco is heated by Smartcore induction, never burned. Every stick TereaCOD lists is factory-sealed, authenticity-checked and priced in AED, spanning all seven sourcing lines from smooth toasted tobaccos to strong Japan menthols and the click-capsule Pearl editions.",
    origin: "Multiple",
    established: "2021",
    accent: "violet",
    featured: true,
    position: 1,
  },
  {
    id: "brand_seed_iqos",
    slug: "iqos",
    name: "IQOS",
    tagline: "The ILUMA heated-tobacco system — devices that heat, never burn.",
    blurb: "IQOS ILUMA and ILUMA i devices: blade-free induction heating, TEREA-only compatibility.",
    description:
      "IQOS ILUMA is the heated-tobacco system built around Smartcore induction heating — no blade, no ash, no smoke. TereaCOD stocks the full ILUMA device line (One, Standard and Prime) with genuine UAE warranty coverage, AED pricing and cash or card on delivery. ILUMA devices work exclusively with TEREA sticks.",
    origin: "Multiple",
    established: "2014",
    accent: "ice",
    featured: true,
    position: 2,
  },
];

const STICK_COMPAT = "IQOS ILUMA devices only — Smartcore induction heating";

function stickSpecs(name: string, profile: string, origin: string): CatalogSeedSpec[] {
  return [
    {
      title: "Product details",
      entries: [
        { label: "Stick family", value: `TEREA ${name}` },
        { label: "Flavour profile", value: profile },
        { label: "Sticks per pack", value: "20 heat sticks" },
        { label: "Nicotine per stick", value: "0.5 mg" },
        { label: "Device compatibility", value: STICK_COMPAT },
      ],
    },
    {
      title: "Pack contents",
      entries: [
        { label: "Sourcing line", value: origin },
        { label: "Pack format", value: "20 factory-sealed heat sticks" },
        { label: "Storage", value: "Cool, dry place away from direct sunlight" },
      ],
    },
  ];
}

function deviceSpecs(model: string, battery: string, box: string): CatalogSeedSpec[] {
  return [
    {
      title: "Device details",
      entries: [
        { label: "Model", value: model },
        { label: "Heating technology", value: "Smartcore induction — blade-free, no cleaning required" },
        { label: "Battery", value: battery },
        { label: "Charge time", value: "Approx. 90 minutes (USB-C)" },
        { label: "Session length", value: "Up to 6 minutes or 14 puffs, whichever comes first" },
        { label: "Compatibility", value: "TEREA heat sticks only" },
      ],
    },
    {
      title: "In the box",
      entries: [
        { label: "Device", value: box },
        { label: "Cable", value: "USB-C charging cable" },
        { label: "Warranty", value: "12 months UAE warranty" },
      ],
    },
  ];
}

export const CATALOG_SEED_PRODUCTS: CatalogSeedProduct[] = [
  /* ------------------------------- TEREA sticks ------------------------------ */
  {
    id: "prd_seed_amber",
    slug: "terea-amber",
    name: "TEREA Amber",
    sku: "TER-AMB-UZ-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "Smooth toasted tobacco with a mellow, rounded draw — the everyday TEREA.",
    description:
      "TEREA Amber is the classic everyday heat stick: a smooth toasted-tobacco blend with a mellow draw and no menthol. Sourced from the Uzbekistan line and heated — never burned — by the IQOS ILUMA's Smartcore induction, each pack carries 20 factory-sealed sticks, dispatched from our Dubai warehouse with cash or card on delivery anywhere in the UAE.",
    priceFils: 4500,
    featured: true,
    nicotine: "0.5 mg",
    origin: "Uzbekistan",
    keywords: [
      "amber",
      "toasted tobacco",
      "smooth",
      "mellow",
      "classic",
      "everyday",
      "pure tobacco",
      "uzbekistan line",
      "terea classic uae",
    ],
    images: ["/products/iqos-stick-pack.jpg", "/products/iqos-stick-duo.jpg"],
    specs: stickSpecs("Amber", "Smooth toasted tobacco — mellow, rounded, no menthol", "Uzbekistan"),
    faqs: [
      {
        question: "Which devices work with TEREA Amber?",
        answer:
          "TEREA Amber works with every IQOS ILUMA and ILUMA i device — One, Standard and Prime. The Smartcore induction heating of the ILUMA range is required; earlier blade-based IQOS models are not compatible with TEREA sticks.",
      },
      {
        question: "How fast is delivery in Dubai?",
        answer:
          "Orders placed before the daily cut-off are dispatched the same day from our Dubai warehouse and typically arrive within an hour inside Dubai. Payment is cash or card on delivery — never prepayment.",
      },
    ],
    rating: { value: 4.6, count: 18 },
    related: ["terea-silver", "terea-yellow", "terea-smooth-regular"],
  },
  {
    id: "prd_seed_turquoise",
    slug: "terea-turquoise",
    name: "TEREA Turquoise",
    sku: "TER-TRQ-DF-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "Crisp cooling menthol over a clean toasted-tobacco base.",
    description:
      "TEREA Turquoise is the crisp, cooling menthol of the Swiss duty-free line: a bright frosty draw layered over a clean toasted-tobacco core. The menthol runs cold without burying the tobacco, making Turquoise the easy all-day menthol choice. 20 factory-sealed sticks per pack, AED pricing, cash or card on delivery across the UAE.",
    priceFils: 4800,
    isNew: true,
    nicotine: "0.5 mg",
    origin: "Switzerland (Duty Free)",
    keywords: [
      "turquoise",
      "menthol",
      "mint",
      "cooling",
      "frosty",
      "fresh",
      "icy",
      "cold",
      "duty free line",
      "terea menthol uae",
    ],
    images: ["/products/iqos-stick-pack.jpg", "/products/iqos-stick-duo.jpg"],
    specs: stickSpecs("Turquoise", "Crisp cooling menthol over a clean toasted-tobacco base", "Switzerland (Duty Free)"),
    rating: { value: 4.5, count: 9 },
    related: ["terea-mint", "terea-purple-wave", "terea-black-menthol"],
  },
  {
    id: "prd_seed_purple_wave",
    slug: "terea-purple-wave",
    name: "TEREA Purple Wave",
    sku: "TER-PW-MULTI-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "Berry-fruit menthol Wave — stocked across three sourcing lines.",
    description:
      "TEREA Purple Wave layers a ripe berry-fruit aroma over a cooling menthol wave — the fruity side of the TEREA range. This listing stocks the flavour across three sourcing lines: the Swiss duty-free edition at the base price, plus the Indonesia and Italy lines at small origin premiums you can pick on the product page. Every line ships factory-sealed from Dubai with cash or card on delivery.",
    priceFils: 5000,
    featured: true,
    isNew: true,
    nicotine: "0.5 mg",
    origin: "Switzerland (Duty Free)",
    keywords: [
      "purple wave",
      "berries",
      "berry",
      "fruity",
      "fruit",
      "menthol",
      "wave",
      "purple",
      "exotic",
      "multi origin",
      "duty free line",
      "indonesia line",
      "italy line",
    ],
    images: ["/products/iqos-stick-duo.jpg", "/products/iqos-stick-pack.jpg"],
    originVariants: [
      { label: "Switzerland (Duty Free)", deltaFils: 0 },
      { label: "Indonesia", deltaFils: 200 },
      { label: "Italy", deltaFils: 200 },
    ],
    specs: stickSpecs("Purple Wave", "Berry-fruit menthol wave — fruity, aromatic, cooling", "Switzerland (Duty Free) / Indonesia / Italy"),
    faqs: [
      {
        question: "What does the Purple Wave flavour taste like?",
        answer:
          "Purple Wave opens with a ripe berry-fruit sweetness and closes with a cool menthol wave — noticeably fruitier than Turquoise or Mint, and the most popular choice for smokers moving from fruity e-liquids to heat-not-burn.",
      },
      {
        question: "Why does Purple Wave list several origins?",
        answer:
          "The same flavour is produced for several TEREA sourcing lines. This listing stocks the Swiss duty-free, Indonesia and Italy editions — each with its own price premium, shown before checkout. Pick an origin on the page and the price updates instantly.",
      },
    ],
    rating: { value: 4.7, count: 21 },
    related: ["terea-purple-menthol", "terea-turquoise", "terea-twilight-pearl"],
  },
  {
    id: "prd_seed_silver",
    slug: "terea-silver",
    name: "TEREA Silver",
    sku: "TER-SLV-DF-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "The lightest toasted tobacco in the range — subtle and refined.",
    description:
      "TEREA Silver is the lightest expression of the toasted-tobacco family: subtle, refined and easy on the palate, sourced through Swiss duty-free channels. If Amber feels too full and menthol is not your style, Silver is the gentle middle ground. 20 sticks per pack, delivered UAE-wide with cash or card on delivery.",
    priceFils: 4600,
    nicotine: "0.5 mg",
    origin: "Switzerland (Duty Free)",
    keywords: ["silver", "light", "smooth", "subtle", "mellow", "refined", "gentle", "duty free line"],
    images: ["/products/iqos-stick-pack.jpg"],
    specs: stickSpecs("Silver", "Light toasted tobacco — subtle, refined, no menthol", "Switzerland (Duty Free)"),
    related: ["terea-amber", "terea-yellow", "terea-smooth-regular"],
  },
  {
    id: "prd_seed_yellow",
    slug: "terea-yellow",
    name: "TEREA Yellow",
    sku: "TER-YLW-DF-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "Mellow toasted tobacco with a rounded, balanced finish.",
    description:
      "TEREA Yellow sits between Silver and Amber: a mellow toasted-tobacco blend with a rounded, balanced finish and no cooling at all. Sourced through Swiss duty-free channels, factory-sealed and dispatched from Dubai — cash or card on delivery, UAE-wide.",
    priceFils: 4500,
    nicotine: "0.5 mg",
    origin: "Switzerland (Duty Free)",
    keywords: ["yellow", "mellow", "smooth", "balanced", "rounded", "tobacco only", "duty free line"],
    images: ["/products/iqos-stick-pack.jpg"],
    specs: stickSpecs("Yellow", "Mellow toasted tobacco — balanced, rounded, no menthol", "Switzerland (Duty Free)"),
    related: ["terea-amber", "terea-silver", "terea-bronze"],
  },
  {
    id: "prd_seed_black_menthol",
    slug: "terea-black-menthol",
    name: "TEREA Black Menthol",
    sku: "TER-BLM-JP-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "The strongest menthol in the range — an intense, freezing draw.",
    description:
      "TEREA Black Menthol is the benchmark cold hit of the entire TEREA range: an intense, freezing menthol layered over deep toasted tobacco, exclusive to the Japan sourcing line. The menthol runs stronger than any duty-free edition, so start here if you want maximum cooling. Japan-origin stock carries a small import premium, shown before checkout — cash or card on delivery.",
    priceFils: 5200,
    compareAtFils: 5500,
    featured: true,
    nicotine: "0.5 mg",
    origin: "Japan",
    keywords: [
      "black menthol",
      "strong menthol",
      "intense",
      "cold",
      "freezing",
      "icy",
      "extra cooling",
      "japan line",
      "japanese market",
      "strongest terea",
    ],
    images: ["/products/iqos-stick-duo.jpg", "/products/iqos-stick-pack.jpg"],
    specs: stickSpecs("Black Menthol", "Intense freezing menthol over deep toasted tobacco — the strongest cooling in the range", "Japan"),
    faqs: [
      {
        question: "How strong is TEREA Black Menthol?",
        answer:
          "Black Menthol is the strongest cooling edition TEREA produces — noticeably colder than Turquoise, Mint or any Wave flavour. If you find it too intense, Purple Menthol or Turquoise are the common step-downs.",
      },
      {
        question: "Is Black Menthol original Japan stock?",
        answer:
          "Yes — Black Menthol is exclusive to the Japan sourcing line. Every pack arrives factory-sealed with Japanese market markings intact, and the origin is stated on the listing and the pack itself.",
      },
    ],
    rating: { value: 4.8, count: 24 },
    related: ["terea-purple-menthol", "terea-mint", "terea-turquoise"],
  },
  {
    id: "prd_seed_purple_menthol",
    slug: "terea-purple-menthol",
    name: "TEREA Purple Menthol",
    sku: "TERM-PRM-JP-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "Berry-toned menthol from the Japan line — the classic purple style.",
    description:
      "TEREA Purple Menthol is the Japan line's take on the purple style: a berry-toned menthol with a cleaner, colder finish than the duty-free Wave editions. Fruit on the entry, frost on the exit. Factory-sealed Japan stock, dispatched from Dubai with cash or card on delivery.",
    priceFils: 5000,
    isNew: true,
    nicotine: "0.5 mg",
    origin: "Japan",
    keywords: ["purple menthol", "berries", "berry", "fruity menthol", "cooling", "japan line", "purple"],
    images: ["/products/iqos-stick-pack.jpg"],
    specs: stickSpecs("Purple Menthol", "Berry-toned menthol — fruit on the entry, frost on the exit", "Japan"),
    related: ["terea-black-menthol", "terea-purple-wave", "terea-mint"],
  },
  {
    id: "prd_seed_rich_regular",
    slug: "terea-rich-regular",
    name: "TEREA Rich Regular",
    sku: "TER-RRG-JP-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "Full-bodied toasted tobacco — the deepest regular draw in the range.",
    description:
      "TEREA Rich Regular is the full-bodied anchor of the Japan line's Regular family: deep, robust toasted tobacco with the strongest tobacco presence of any non-menthol TEREA. For smokers who want the heat-not-burn experience closest to a full-flavour cigarette. Japan-origin stock, factory-sealed, cash or card on delivery.",
    priceFils: 5200,
    nicotine: "0.5 mg",
    origin: "Japan",
    keywords: [
      "rich regular",
      "full body",
      "full flavour",
      "strong tobacco",
      "robust",
      "bold",
      "deep",
      "tobacco only",
      "japan line",
    ],
    images: ["/products/iqos-stick-pack.jpg"],
    specs: stickSpecs("Rich Regular", "Full-bodied toasted tobacco — deep, robust, no menthol", "Japan"),
    related: ["terea-smooth-regular", "terea-amber", "terea-sienna"],
  },
  {
    id: "prd_seed_smooth_regular",
    slug: "terea-smooth-regular",
    name: "TEREA Smooth Regular",
    sku: "TERM-SRG-JP-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "The mildest regular draw — a gentle, easy toasted tobacco.",
    description:
      "TEREA Smooth Regular is the gentle end of the Japan Regular family: a light, easy toasted tobacco with a soft draw and no menthol. The common recommendation for smokers switching from lights or ultra-lights. Japan-origin stock, factory-sealed and dispatched from Dubai.",
    priceFils: 5000,
    nicotine: "0.5 mg",
    origin: "Japan",
    keywords: ["smooth regular", "mild", "gentle", "light tobacco", "easy", "pure tobacco", "japan line"],
    images: ["/products/iqos-stick-pack.jpg"],
    specs: stickSpecs("Smooth Regular", "Mild toasted tobacco — gentle, light, no menthol", "Japan"),
    related: ["terea-rich-regular", "terea-silver", "terea-amber"],
  },
  {
    id: "prd_seed_mint",
    slug: "terea-mint",
    name: "TEREA Mint",
    sku: "TEM-MINT-JP-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "Clean, straightforward mint — fresh without the frost.",
    description:
      "TEREA Mint is the honest, no-frills cooling stick of the Japan line: clean spearmint freshness with less intensity than Black Menthol and no fruit notes. The everyday fresh choice for menthol smokers who want clarity over cold. Factory-sealed Japan stock with cash or card on delivery.",
    priceFils: 5000,
    nicotine: "0.5 mg",
    origin: "Japan",
    keywords: ["mint", "spearmint", "fresh", "clean", "crisp", "cooling", "japan line"],
    images: ["/products/iqos-stick-pack.jpg"],
    specs: stickSpecs("Mint", "Clean spearmint — fresh, straightforward, lighter than Black Menthol", "Japan"),
    related: ["terea-turquoise", "terea-black-menthol", "terea-purple-menthol"],
  },
  {
    id: "prd_seed_yugen",
    slug: "terea-yugen-dimension",
    name: "TEREA Yugen Dimension",
    sku: "TER-YUG-ID-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "The Dimension Series flagship — deep floral tobacco, Indonesia exclusive.",
    description:
      "TEREA Yugen is the crown of the Indonesia-exclusive Dimension Series: a rich, layered tobacco with floral depth you will not find anywhere else in the range. Rare, premium and consistently one of the most requested editions in the UAE. Small import premium shown up front — cash or card on delivery from Dubai.",
    priceFils: 5800,
    featured: true,
    nicotine: "0.5 mg",
    origin: "Indonesia",
    keywords: [
      "yugen",
      "dimension series",
      "dimension",
      "floral",
      "premium",
      "exotic",
      "rare",
      "rich tobacco",
      "indonesia line",
      "limited",
    ],
    images: ["/products/iqos-stick-duo.jpg"],
    specs: stickSpecs("Yugen Dimension", "Deep floral tobacco — layered, premium, Dimension Series exclusive", "Indonesia"),
    rating: { value: 4.9, count: 12 },
    related: ["terea-sun-pearl", "terea-sienna", "terea-bronze"],
  },
  {
    id: "prd_seed_sun_pearl",
    slug: "terea-sun-pearl",
    name: "TEREA Sun Pearl",
    sku: "TERM-SUP-ID-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "Click-capsule Pearl — crush for a tropical, juicy fruit burst.",
    description:
      "TEREA Sun Pearl adds the click-capsule ritual to the Indonesia line: press the Pearl in the filter and a tropical, juicy fruit aroma releases over the menthol base. Two experiences in one stick — smooth before the click, vivid after. Factory-sealed Indonesia stock, dispatched from Dubai with cash or card on delivery.",
    priceFils: 5500,
    isNew: true,
    nicotine: "0.5 mg",
    origin: "Indonesia",
    keywords: [
      "sun pearl",
      "pearl",
      "capsule",
      "click",
      "click capsule",
      "tropical",
      "juicy",
      "fruit burst",
      "indonesia line",
    ],
    images: ["/products/iqos-stick-pack.jpg"],
    specs: stickSpecs("Sun Pearl", "Tropical juicy fruit capsule over a cooling menthol base — click to release", "Indonesia"),
    faqs: [
      {
        question: "How do I use the Pearl click-capsule?",
        answer:
          "Locate the small Pearl in the filter, press it between your fingers until it clicks, then heat the stick as normal. The capsule releases a tropical fruit aroma over the menthol. The stick works fine unclicked too — the capsule is optional, not a requirement.",
      },
    ],
    rating: { value: 4.6, count: 11 },
    related: ["terea-twilight-pearl", "terea-yugen-dimension", "terea-purple-wave"],
  },
  {
    id: "prd_seed_twilight_pearl",
    slug: "terea-twilight-pearl",
    name: "TEREA Twilight Pearl",
    sku: "TEM-TWP-DF-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "Click-capsule cooling burst — the freshest Pearl of the duty-free line.",
    description:
      "TEREA Twilight Pearl is the duty-free line's freshest click-capsule edition: a smooth toasted-tobacco base that turns into a burst of cooling freshness the moment the Pearl is crushed. The most requested Pearl in the UAE after Sun Pearl. Factory-sealed, AED pricing, cash or card on delivery.",
    priceFils: 5400,
    nicotine: "0.5 mg",
    origin: "Switzerland (Duty Free)",
    keywords: [
      "twilight pearl",
      "pearl",
      "capsule",
      "click",
      "click capsule",
      "cooling burst",
      "fresh",
      "duty free line",
    ],
    images: ["/products/iqos-stick-pack.jpg"],
    specs: stickSpecs("Twilight Pearl", "Cooling-fresh click capsule over a smooth toasted-tobacco base", "Switzerland (Duty Free)"),
    related: ["terea-sun-pearl", "terea-purple-wave", "terea-turquoise"],
  },
  {
    id: "prd_seed_sienna",
    slug: "terea-sienna",
    name: "TEREA Sienna",
    sku: "TERM-SIN-ID-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "Deep woody tobacco with cocoa and dried-fruit notes.",
    description:
      "TEREA Sienna is the deep, woody side of the Indonesia line: toasted tobacco with cocoa and dried-fruit notes and a fuller draw than the duty-free classics. A winter-weight stick for smokers who find Amber too light. Factory-sealed Indonesia stock, cash or card on delivery.",
    priceFils: 4800,
    nicotine: "0.5 mg",
    origin: "Indonesia",
    keywords: ["sienna", "woody", "cocoa", "dried fruit", "deep", "full", "aromatic", "indonesia line"],
    images: ["/products/iqos-stick-pack.jpg"],
    specs: stickSpecs("Sienna", "Deep woody tobacco — cocoa and dried-fruit notes, fuller draw", "Indonesia"),
    related: ["terea-bronze", "terea-rich-regular", "terea-yugen-dimension"],
  },
  {
    id: "prd_seed_bronze",
    slug: "terea-bronze",
    name: "TEREA Bronze",
    sku: "TERM-BRZ-ID-01",
    brand: "terea",
    category: "terea-sticks",
    tagline: "Nutty, roasted tobacco with an aromatic bold finish.",
    description:
      "TEREA Bronze rounds out the Indonesia line with a nutty, roasted character and an aromatic, bold finish — sits between Amber and Sienna on body. Factory-sealed Indonesia stock with AED pricing shown up front and cash or card on delivery.",
    priceFils: 4700,
    nicotine: "0.5 mg",
    origin: "Indonesia",
    keywords: ["bronze", "nutty", "roasted", "bold", "aromatic", "earthy", "indonesia line"],
    images: ["/products/iqos-stick-pack.jpg"],
    specs: stickSpecs("Bronze", "Nutty roasted tobacco — aromatic, bold finish", "Indonesia"),
    related: ["terea-sienna", "terea-amber", "terea-yellow"],
  },

  /* ------------------------------ IQOS devices ------------------------------- */
  {
    id: "prd_seed_iluma_one",
    slug: "iqos-iluma-one",
    name: "IQOS ILUMA One",
    sku: "IQO-IL1-ONE-01",
    model: "ILUMA One",
    brand: "iqos",
    category: "iqos-devices",
    tagline: "The all-in-one starter ILUMA — simplest way into heat-not-burn.",
    description:
      "IQOS ILUMA One is the all-in-one entry into blade-free heat-not-burn: holder and charger in a single pocketable body, heated by Smartcore induction with no blade and no cleaning. Works exclusively with TEREA sticks. Genuine UAE stock with 12-month warranty, AED pricing and cash or card on delivery.",
    priceFils: 14900,
    compareAtFils: 17900,
    featured: true,
    origin: "Multiple",
    keywords: [
      "iluma one",
      "starter",
      "entry level",
      "all in one",
      "device",
      "kit",
      "pocket",
      "beginner",
      "iluma",
      "iqos device uae",
    ],
    images: ["/products/iqos-stick-device.jpg"],
    specs: deviceSpecs("ILUMA One (all-in-one)", "Built-in battery — approx. 20 sessions per full charge", "ILUMA One device"),
    faqs: [
      {
        question: "Does ILUMA One work with HEETS?",
        answer:
          "No — the ILUMA range heats exclusively with TEREA sticks. The Smartcore induction system is not compatible with earlier blade-based sticks like HEETS. Browse the TEREA Sticks collection for the full flavour range.",
      },
      {
        question: "How long does the battery last?",
        answer:
          "A full charge delivers around 20 heat sessions (approximately 6 minutes or 14 puffs each) and recharges in roughly 90 minutes over USB-C.",
      },
    ],
    rating: { value: 4.7, count: 31 },
    related: ["iqos-iluma-standard", "iqos-iluma-prime", "terea-amber"],
  },
  {
    id: "prd_seed_iluma_standard",
    slug: "iqos-iluma-standard",
    name: "IQOS ILUMA Standard",
    sku: "IQO-ILS-STD-01",
    model: "ILUMA Standard",
    brand: "iqos",
    category: "iqos-devices",
    tagline: "The classic two-piece ILUMA — holder and pocket charger.",
    description:
      "IQOS ILUMA Standard is the classic two-piece setup: a lightweight holder for the session and a pocket charger that tops it up between sticks. Blade-free Smartcore induction, TEREA-only compatibility, genuine UAE stock with 12-month warranty and cash or card on delivery.",
    priceFils: 18900,
    origin: "Multiple",
    keywords: ["iluma standard", "holder", "pocket charger", "two piece", "device", "kit", "iluma", "iqos device uae"],
    images: ["/products/iqos-stick-device.jpg", "/products/iqos-stick-duo.jpg"],
    specs: deviceSpecs("ILUMA Standard (holder + pocket charger)", "Holder: 1 session per charge · Charger: approx. 20 sessions", "ILUMA holder + pocket charger"),
    rating: { value: 4.6, count: 14 },
    related: ["iqos-iluma-one", "iqos-iluma-prime", "terea-turquoise"],
  },
  {
    id: "prd_seed_iluma_prime",
    slug: "iqos-iluma-prime",
    name: "IQOS ILUMA Prime",
    sku: "IQO-ILP-PRM-01",
    model: "ILUMA Prime",
    brand: "iqos",
    category: "iqos-devices",
    tagline: "The flagship ILUMA — premium finish, automatic stick detection.",
    description:
      "IQOS ILUMA Prime is the flagship of the range: a premium metal-and-leather finish, automatic stick detection that starts heating the moment a TEREA is inserted, and the longest battery life of the ILUMA line. Available in Obsidian Black, Sand Gold and Forest Green. Genuine UAE stock, 12-month warranty, cash or card on delivery.",
    priceFils: 26900,
    featured: true,
    isNew: true,
    origin: "Multiple",
    keywords: [
      "iluma prime",
      "flagship",
      "premium",
      "leather",
      "automatic",
      "top model",
      "device",
      "iluma",
      "iqos device uae",
      "obsidian",
      "sand gold",
      "forest green",
    ],
    images: ["/products/iqos-stick-device.jpg"],
    colorVariants: [
      { label: "Obsidian Black", swatch: "#1f1f1f" },
      { label: "Sand Gold", swatch: "#c8a96b" },
      { label: "Forest Green", swatch: "#2f4f3e" },
    ],
    specs: deviceSpecs("ILUMA Prime (holder + pocket charger)", "Holder: 2 sessions per charge · Charger: approx. 20 sessions", "ILUMA Prime holder + pocket charger"),
    faqs: [
      {
        question: "What is the difference between ILUMA Prime and ILUMA One?",
        answer:
          "Prime is the two-piece flagship: premium finish, automatic stick detection, two sessions per holder charge and the strongest battery life. One is the all-in-one starter with the same Smartcore heating in a single body — same TEREA experience, simpler package.",
      },
    ],
    rating: { value: 4.8, count: 15 },
    related: ["iqos-iluma-one", "iqos-iluma-standard", "terea-black-menthol"],
  },
];
