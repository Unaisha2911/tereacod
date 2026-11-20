import type { Metadata } from "next";
import { Star } from "lucide-react";
import { Link } from "@/components/shared/shop-link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/layout/breadcrumbs";
import { InformationAccordion, type AccordionPanel } from "@/components/shared/information-accordion";
import { SpecificationList } from "@/components/shared/specification-list";
import { ItemGrid } from "@/components/shared/item-grid";
import { toCardItems } from "@/lib/catalog-card";
import { originChipDataForItem, originVariantIdForSlug } from "@/lib/catalog-origin";
import { getBrands, getCategoryBySlugRepo, getProductBySlug } from "@/server/data";
import { getProductsBySlugs } from "@/server/repos/catalog";
import { breadcrumbJsonLd, canonical, faqJsonLd, JsonLd, productJsonLd, siteUrl } from "@/lib/seo";
import { ProductDetailShell } from "./product-detail-shell";
import { ProductSaveButton } from "./product-save-button";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  /** Deep link from a card's "See all origins" popup: ?origin=<line-slug>. */
  searchParams: Promise<{ origin?: string | string[] }>;
}

/**
 * Visible customer-rating strip (owner-curated product_ratings data).
 * Doubles as the on-page evidence the Product JSON-LD aggregateRating
 * requires — markup without this visible counterpart is a rich-result
 * violation. Fractional scores render via a width-clipped fill overlay,
 * so 4.6 / 5 paints 92% of the star row without half-glyph juggling.
 */
function RatingStrip({ rating }: { rating: { value: number; count: number } }) {
  const stars = (filled: boolean) => (
    <span
      aria-hidden="true"
      className={`flex gap-0.5 ${filled ? "text-amber-500" : "text-line"}`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className="size-3.5" fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
  return (
    <div
      className="flex flex-wrap items-center gap-x-2.5 gap-y-1"
      role="img"
      aria-label={`Rated ${rating.value} out of 5 by ${rating.count} customers`}
    >
      <span className="relative inline-block align-middle" aria-hidden="true">
        {stars(false)}
        <span
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${Math.min(100, Math.max(0, (rating.value / 5) * 100))}%` }}
        >
          {stars(true)}
        </span>
      </span>
      <span className="text-sm text-muted-foreground">
        <strong className="font-semibold text-foreground">{rating.value.toFixed(1)}</strong>
        {" "}/ 5 · {rating.count} customer {rating.count === 1 ? "rating" : "ratings"}
      </span>
    </div>
  );
}

// No generateStaticParams: the catalog is authored in the admin console after
// go-live, so a build-time enumeration reads an EMPTY local database in CI
// (returning nothing) while still contending for the fresh SQLite file with
// the parallel page-data workers — the source of a "database is locked"
// build failure. Product slugs resolve per request at runtime instead.

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getProductBySlug(slug);
  // Unknown slug: the page body below raises notFound() — under the (site)
  // loading boundary (Next 16.4.5) a BODY-level notFound still commits a
  // real 404 status, while a metadata-level one flushes a 200 soft-404.
  // Metadata therefore degrades to a conservative noindex block so the
  // not-found shell can never enter the index, and per-page OG stays out
  // of the 404 path entirely.
  if (!item) {
    return {
      title: "Page not found",
      robots: { index: false, follow: false },
    };
  }
  // Per-page social cards (shallow-merged over the layout defaults) — the
  // product's own name, copy and lead image, not the generic site OG art.
  const ogImages = item.images.length
    ? item.images.slice(0, 1).map((src) => ({ url: siteUrl(src), alt: item.name }))
    : [{ url: siteUrl("/og-image.jpg"), alt: `TereaCOD — ${item.name}` }];
  return {
    title: `${item.name} — ${item.tagline}`,
    description: item.description,
    keywords: [item.name, item.brand, `${item.name} UAE`, `${item.brand} Dubai`, "buy terea online uae", "terea delivery uae"],
    ...canonical(`/products/${item.slug}`),
    openGraph: {
      title: `${item.name} — ${item.tagline}`,
      description: item.description,
      url: siteUrl(`/products/${item.slug}`),
      type: "website",
      siteName: "TereaCOD",
      locale: "en_AE",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${item.name} — ${item.tagline}`,
      description: item.description,
      images: ogImages.map((image) => image.url),
    },
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params;
  const { origin: originParam } = await searchParams;
  const item = await getProductBySlug(slug);
  if (!item) notFound();

  // Deep link ?origin=<line-slug> (card "See all origins" popup rows):
  // resolve the matching available origin variant so the shell opens with
  // that sourcing line preselected — price, photo and origin chip all
  // reflect it on first paint. Unknown/unavailable slugs fall back to the
  // default selection.
  const initialOriginVariantId = originVariantIdForSlug(item.variants, originParam);

  // Product detail badge row data. The origin chip under the price is
  // SELECTION-REACTIVE: the server precomputes a compact line-resolution
  // table (product-level Details origin + every origin variant → line),
  // and the client shell flips the chip's flag/label and /origin/<slug>
  // link the moment a different Origin pill is picked. Compact on purpose —
  // the full origin lines (SEO copy) never cross the server→client edge.
  const originChip = originChipDataForItem(item);

  const [category, brand, related] = await Promise.all([
    getCategoryBySlugRepo(item.categorySlug),
    // brandByName equivalent — resolve by (case-insensitive) brand name.
    getBrands().then((brands) =>
      brands.find((candidate) => candidate.name.toLowerCase() === item.brand.toLowerCase()) ?? null,
    ),
    // One batched IN query for ALL related slugs — the former
    // per-slug getProductBySlug map ran 1+5 queries PER related item.
    getProductsBySlugs(item.relatedSlugs ?? []),
  ]);

  const crumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label: "Collections", href: "/collections" },
  ];
  if (category) crumbs.push({ label: category.name, href: `/collections/${category.slug}` });
  crumbs.push({ label: item.name });

  // Rich-result graphs: Product/Offer + the visible breadcrumb trail
  // (+ FAQPage when the listing carries its own questions).
  const structuredData = [
    productJsonLd(item, brand?.name),
    breadcrumbJsonLd(crumbs),
    ...(item.faqs?.length ? [faqJsonLd(item.faqs)] : []),
  ];

  const panels: AccordionPanel[] = [
    {
      id: "description",
      title: "Description",
      content: <p>{item.description}</p>,
    },
    // Specifications render ONLY when authored — on every viewport, expanded
    // directly below the Description panel (mobile order: description → spec).
    ...(item.specs.length > 0
      ? [
          {
            id: "specifications",
            title: "Specifications",
            content: <SpecificationList groups={item.specs} />,
          } satisfies AccordionPanel,
        ]
      : []),
    ...(item.faqs?.length
      ? [
          {
            id: "faqs",
            title: "Frequently asked questions",
            content: (
              <div className="space-y-5">
                {item.faqs.map((faq) => (
                  <div key={faq.question}>
                    <h4 className="font-display text-[0.92rem] font-semibold text-foreground">{faq.question}</h4>
                    <p className="mt-1.5">{faq.answer}</p>
                  </div>
                ))}
              </div>
            ),
          } satisfies AccordionPanel,
        ]
      : []),
  ];

  return (
    <div>
      <JsonLd data={structuredData} />
      <PageContainer>
        <div className="pt-6">
          <Breadcrumbs items={crumbs} />
        </div>

        <ProductDetailShell
          item={item}
          originChip={originChip}
          initialOriginVariantId={initialOriginVariantId}
          belowPrice={
            <p className="font-mono text-meta uppercase tracking-[0.08em] text-muted-foreground">
              SKU {item.sku}
              {item.model ? (
                <>
                  {" \u00b7 "}
                  Model {item.model}
                </>
              ) : null}
            </p>
          }
>
          {/* Brand chip — a real link when the brand resolves in the
              directory; an inert label otherwise (never href="#"). */}
            {brand ? (
              <Link
                href={`/brand/${brand.slug}`}
                aria-label={`View all ${brand.name} products`}
                className="inline-flex items-center gap-2 self-start rounded-full border border-violet-glow/40 bg-foreground/[0.03] px-3.5 py-1.5 text-label font-medium uppercase tracking-[0.22em] text-violet-soft transition-colors hover:border-violet-glow/70"
              >
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-violet-soft"
                />
                {item.brand}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-foreground/[0.03] px-3.5 py-1.5 text-label font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-violet-soft"
                />
                {item.brand}
              </span>
            )}
            <h1 className="text-h1 font-bold">{item.name}</h1>
            <p className="text-lead text-muted-foreground">{item.tagline}</p>

            {/* Visible mirror of the aggregateRating in the Product JSON-LD
                above — present only for owner-rated listings. */}
            {item.rating && <RatingStrip rating={item.rating} />}

            {/* Price — rendered by ProductDetailShell so it reacts to the
                selected colour/origin options. On mobile the full spec
                sheet lives in the "Product details" accordion below,
                expanded directly under the Description panel. */}

        </ProductDetailShell>

        {/* Product details */}
        <section id="product-details" aria-labelledby="product-details-heading" className="scroll-mt-28 pt-16">
          <h2 id="product-details-heading" className="text-h2 font-bold">
            Product details
          </h2>
          <p className="max-w-2xl pt-3 text-muted-foreground">
            The full listing for {item.name} — description, technical specifications and buying information.
            Description and specifications are expanded by default; toggle any panel as you like.
          </p>
          <div className="pt-6">
            {/* Description and specifications (when authored) start expanded,
                on every viewport — description first, specifications directly
                below it. */}
            <InformationAccordion
              panels={panels}
              defaultOpen={[
                "description",
                ...(item.specs.length > 0 ? ["specifications"] : []),
              ]}
            />
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="pb-16 pt-16">
            <h2 id="related-heading" className="text-h2 font-bold">
              Related products
            </h2>
            <p className="max-w-2xl pt-3 text-muted-foreground">
              Other products commonly viewed alongside {item.name} — from the same brand and collection.
            </p>
            <div className="pt-8">
              <ItemGrid items={toCardItems(related)} columns={4} />
            </div>
            <div className="pt-10">
              <Link
                href="/discover"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 text-sm text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
              >
                Browse the full range
              </Link>
            </div>
          </section>
        )}
      </PageContainer>
    </div>
  );
}
