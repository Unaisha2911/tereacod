import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/layout/breadcrumbs";
import { InformationAccordion, type AccordionPanel } from "@/components/shared/information-accordion";
import { SpecificationList } from "@/components/shared/specification-list";
import { AvailabilityBadge } from "@/components/shared/status-badge";
import { ItemGrid } from "@/components/shared/item-grid";
import { toCardItems } from "@/lib/catalog-card";
import { originLineForItem } from "@/lib/catalog-origin";
import { getBrands, getCategoryBySlugRepo, getProductBySlug, getProducts } from "@/server/data";
import { getProductsBySlugs } from "@/server/repos/catalog";
import { breadcrumbJsonLd, canonical, faqJsonLd, JsonLd, productJsonLd, siteUrl } from "@/lib/seo";
import { ProductDetailShell } from "./product-detail-shell";
import { ProductSaveButton } from "./product-save-button";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await getProducts()).map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getProductBySlug(slug);
  // notFound() is raised here in generateMetadata (and again in the page body)
  // so unknown slugs return a real 404 status code. No loading.tsx Suspense
  // boundary exists on this route by design — raising notFound() only in a
  // streamed body would ship a 200 soft-404.
  if (!item) notFound();
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

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const item = await getProductBySlug(slug);
  if (!item) notFound();

  // Product-level sourcing line (admin "Details" dropdown → products.origin).
  // Shown as a chip under the price so the origin is visible even when the
  // listing carries no origin-type variants — matching the chips on every
  // listing card and the /origin landing pages.
  const originLine = originLineForItem(item);

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
    {
      id: "specifications",
      title: "Specifications",
      // On mobile the spec sheet is already expanded inline above the
      // price, so the collapsed accordion copy would only duplicate it.
      className: item.specs.length > 0 ? "hidden lg:block" : undefined,
      content: <SpecificationList groups={item.specs} />,
    },
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
          belowPrice={
            <>
              <p className="font-mono text-meta uppercase tracking-[0.08em] text-muted-foreground">
                SKU {item.sku}
                {item.model ? (
                  <>
                    {" \u00b7 "}
                    Model {item.model}
                  </>
                ) : null}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <AvailabilityBadge availability={item.availability} />
                {originLine && (
                  <Link
                    href={`/origin/${originLine.slug}`}
                    title={`Origin: ${originLine.label}`}
                    aria-label={`View all ${originLine.label} origin products`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-violet-glow/40 bg-foreground/[0.03] px-2.5 py-1 text-[0.72rem] font-medium tracking-wide text-violet-soft transition-colors hover:border-violet-glow/70"
                  >
                    <span aria-hidden="true" className="text-[0.8rem] leading-none">{originLine.flag}</span>
                    {originLine.label}
                  </Link>
                )}
                {item.nicotineStrength && (
                  <span className="inline-flex items-center rounded-full border border-line px-2.5 py-1 text-[0.72rem] font-medium tracking-wide text-muted-foreground">
                    {item.nicotineStrength}
                  </span>
                )}
                <ProductSaveButton itemId={item.id} name={item.name} />
              </div>
            </>
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
                  style={{ boxShadow: "0 0 8px 2px rgba(167,139,250,0.7)" }}
                />
                {item.brand}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-foreground/[0.03] px-3.5 py-1.5 text-label font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-violet-soft"
                  style={{ boxShadow: "0 0 8px 2px rgba(167,139,250,0.7)" }}
                />
                {item.brand}
              </span>
            )}
            <h1 className="text-h1 font-bold">{item.name}</h1>
            <p className="text-lead text-muted-foreground">{item.tagline}</p>

            {/* Mobile only — the full spec sheet is expanded inline here,
                just before the price. On desktop specs live in the
                "Product details" accordion below (panel stays lg+ only). */}
            {item.specs.length > 0 && (
              <section
                aria-labelledby="mobile-specs-heading"
                className="scroll-mt-28 lg:hidden"
              >
                <h2
                  id="mobile-specs-heading"
                  className="text-label font-semibold uppercase tracking-[0.18em] text-violet-soft"
                >
                  Specifications
                </h2>
                <div className="pt-3">
                  <SpecificationList groups={item.specs} />
                </div>
              </section>
            )}

            {/* Price — rendered by ProductDetailShell so it reacts to the
                selected colour/origin options. */}

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
            {/* Description + specifications start expanded (desktop accordion;
                on mobile the spec sheet is already inline above the price). */}
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
