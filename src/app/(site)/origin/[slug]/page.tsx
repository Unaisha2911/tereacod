import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SectionAtmosphere } from "@/components/atmosphere/section-atmosphere";
import { CatalogBrowser } from "@/components/shared/catalog-browser";
import { OriginFilterChips } from "@/components/shared/origin-filter-chips";
import { toCardItems } from "@/lib/catalog-card";
import { SeoContent } from "@/components/shared/seo-content";
import { getProducts, getCategories, getBrands } from "@/server/data";
import { ORIGIN_LINES, originLineBySlug, originSlugsForItem, type OriginLine } from "@/lib/catalog-origin";
import { USP_FREE_DELIVERY, USP_ONE_HOUR_DELIVERY, USP_PAYMENT } from "@/lib/usp";
import { breadcrumbJsonLd, canonical, itemListJsonLd, JsonLd, siteUrl } from "@/lib/seo";
import type { Brand, CatalogItem } from "@/types";

interface OriginPageProps {
  params: Promise<{ slug: string }>;
  /** Combined facet params — collection / brand / q narrow this origin page. */
  searchParams: Promise<{ collection?: string; brand?: string; q?: string }>;
}

/** Combined-filter context carried between facet links. */
type FacetContext = { collection?: string; brand?: string; q?: string };

/** URL for this origin line with the given facet context (empties dropped). */
function originHref(slug: string, context: FacetContext, overrides?: FacetContext): string {
  const merged = { ...context, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/origin/${slug}?${qs}` : `/origin/${slug}`;
}

/** Loose query match — name, tagline or brand contains the needle. */
function matchesQuery(item: Pick<CatalogItem, "name" | "tagline" | "brand">, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    item.name.toLowerCase().includes(needle) ||
    item.tagline.toLowerCase().includes(needle) ||
    item.brand.toLowerCase().includes(needle)
  );
}

/**
 * The shelf for one origin line under the combined facets — the
 * intersection of (this line) × (?collection) × (?brand) × (?q). The
 * brand facet accepts either the brand slug (what brand pages carry) or
 * its exact name. ONE shared implementation so the <title> count always
 * matches the rendered shelf.
 */
function filterOriginShelf(
  allItems: CatalogItem[],
  line: OriginLine,
  facets: FacetContext,
  brands: Brand[]
): CatalogItem[] {
  let items = allItems.filter((item) => originSlugsForItem(item).includes(line.slug));
  if (facets.collection) items = items.filter((item) => item.categorySlug === facets.collection);
  if (facets.brand) {
    const needle = facets.brand.toLowerCase();
    const brandName =
      brands.find((b) => b.slug.toLowerCase() === needle)?.name ??
      brands.find((b) => b.name.toLowerCase() === needle)?.name ??
      facets.brand;
    items = items.filter((item) => item.brand.toLowerCase() === brandName.toLowerCase());
  }
  if (facets.q) items = items.filter((item) => matchesQuery(item, facets.q as string));
  return items;
}

/** Group items by a facet value, keep non-empty groups sorted by count. */
function buildFacetChips(
  items: CatalogItem[],
  keyOf: (item: CatalogItem) => string,
  labelOf: (value: string) => string
): Array<{ value: string; label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: labelOf(value), count }))
    .sort((a, b) => b.count - a.count);
}

export async function generateStaticParams() {
  return ORIGIN_LINES.map((line) => ({ slug: line.slug }));
}

export async function generateMetadata({ params, searchParams }: OriginPageProps): Promise<Metadata> {
  const { slug } = await params;
  const line = originLineBySlug(slug);
  if (!line) notFound();
  const { collection, brand, q } = await searchParams;
  const trimmedQ = q?.trim() || undefined;
  const [allItems, brands] = await Promise.all([getProducts(), getBrands()]);
  const items = filterOriginShelf(allItems, line, { collection, brand, q: trimmedQ }, brands);
  // Combined views keep the line's canonical meta (the URL canonicals to
  // the clean /origin/<slug>) with the facet count reflected in the title.
  const title = `${line.metaTitle.split("|")[0].trim()} — ${items.length} ${items.length === 1 ? "product" : "products"}`;
  const description = line.metaDescription;
  return {
    title,
    description,
    keywords: [...line.keywords],
    ...canonical(`/origin/${line.slug}`),
    // Shallow-merge replaces the layout OG object — restate the fallback art.
    openGraph: {
      title,
      description,
      url: siteUrl(`/origin/${line.slug}`),
      type: "website",
      siteName: "TereaCOD",
      locale: "en_AE",
      images: [{ url: siteUrl("/og-image.jpg"), width: 1200, height: 630, alt: `TereaCOD — TEREA ${line.chipLabel} sticks UAE` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteUrl("/og-image.jpg")],
    },
  };
}

/** Origin landing page — one TEREA sourcing line per URL.
 *
 *  Dedicated indexable pages for the origin facet (Duty Free multi /
 *  Indonesia / Japan): hero copy, a 16-per-batch Load more grid, other
 *  origin lines for cross-navigation and editorial SEO copy below.
 *
 *  COMBINED FACETS: the page accepts ?collection= / ?brand= / ?q= and
 *  narrows the shelf to the intersection — collection shelves, brand
 *  pages and search link here with their context carried along, and this
 *  page offers collection/brand chips + a clearable active-filter bar, so
 *  every facet combination is a real, working URL. */
export default async function OriginPage({ params, searchParams }: OriginPageProps) {
  const { slug } = await params;
  const line = originLineBySlug(slug);
  if (!line) notFound();

  const { collection, brand, q } = await searchParams;
  const trimmedQ = q?.trim() || undefined;
  const facets: FacetContext = { collection, brand, q: trimmedQ };
  const isCombined = Boolean(collection || brand || trimmedQ);

  const [allItems, categories, brands] = await Promise.all([getProducts(), getCategories(), getBrands()]);

  const items = filterOriginShelf(allItems, line, facets, brands);
  const originItems = allItems.filter((item) => originSlugsForItem(item).includes(line.slug));
  const otherLines = ORIGIN_LINES.filter((other) => other.slug !== line.slug);

  // Display names for the active-filter chips.
  const contextBrandName =
    (brand &&
      (brands.find((b) => b.slug.toLowerCase() === brand.toLowerCase())?.name ??
        brands.find((b) => b.name.toLowerCase() === brand.toLowerCase())?.name ??
        brand)) ||
    undefined;
  const categoryName = categories.find((c) => c.slug === collection)?.name ?? collection;

  // Combined-facet chips — collections/brands holding at least one product
  // on this origin line; each chip deep-links the intersection. The facet
  // currently active hides its own chip row (the active bar shows it).
  const collectionChips = collection
    ? []
    : buildFacetChips(originItems, (item) => item.categorySlug, (value) => categories.find((c) => c.slug === value)?.name ?? value);
  const brandChips = brand
    ? []
    : buildFacetChips(
        originItems,
        (item) => item.brand.toLowerCase(),
        (value) => brands.find((b) => b.name.toLowerCase() === value)?.name ?? value
      );

  const activeFilters = [
    collection
      ? { key: "collection", label: `Collection: ${categoryName}`, href: originHref(slug, facets, { collection: undefined }) }
      : null,
    contextBrandName
      ? { key: "brand", label: `Brand: ${contextBrandName}`, href: originHref(slug, facets, { brand: undefined }) }
      : null,
    trimmedQ
      ? { key: "q", label: `Search: “${trimmedQ}”`, href: originHref(slug, facets, { q: undefined }) }
      : null,
  ].filter((chip): chip is { key: string; label: string; href: string } => chip !== null);

  // Facet-aware counts for the sibling origin chips — within the active
  // collection/brand/search scope, how many products sit on each line.
  const facetOriginCounts = isCombined
    ? (() => {
        const scoped = allItems
          .filter((item) => (collection ? item.categorySlug === collection : true))
          .filter((item) =>
            contextBrandName ? item.brand.toLowerCase() === contextBrandName.toLowerCase() : true
          )
          .filter((item) => (trimmedQ ? matchesQuery(item, trimmedQ) : true));
        const counts: Record<string, number> = {};
        for (const line2 of ORIGIN_LINES) {
          counts[line2.slug] = scoped.filter((item) => originSlugsForItem(item).includes(line2.slug)).length;
        }
        return counts;
      })()
    : undefined;

  return (
    <section className="relative">
      <SectionAtmosphere variant="violet" intensity={0.5} />
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { label: "Home", href: "/" },
            { label: "Discover", href: "/discover" },
            { label: `TEREA ${line.chipLabel}` },
          ]),
          itemListJsonLd(items, `TEREA ${line.chipLabel} sticks — TereaCOD UAE`),
        ]}
      />
      <PageContainer className="relative z-10">
        <div className="pt-6">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Discover", href: "/discover" },
              { label: `TEREA ${line.chipLabel}` },
            ]}
          />
        </div>

        <header className="max-w-2xl pb-8 pt-8">
          <p className="text-label font-medium uppercase tracking-[0.22em] text-violet-soft">TEREA origin line</p>
          <h1 className="pt-3 text-h1 font-bold">
            <span aria-hidden="true" className="mr-2">{line.flag}</span>
            TEREA {line.label} sticks
          </h1>
          <p className="pt-4 text-lead text-muted-foreground">{line.intro}</p>
          <div className="flex flex-wrap items-center gap-2 pt-6">
            <span className="inline-flex min-h-9 items-center rounded-full border border-line bg-elevated/45 px-3.5 text-[0.8rem] text-muted-foreground">
              {items.length} {items.length === 1 ? "flavour" : "flavours"}
            </span>
            <span className="inline-flex min-h-9 items-center rounded-full border border-line bg-elevated/45 px-3.5 text-[0.8rem] text-muted-foreground">
              {USP_FREE_DELIVERY}
            </span>
            <span className="inline-flex min-h-9 items-center rounded-full border border-line bg-elevated/45 px-3.5 text-[0.8rem] text-muted-foreground">
              {USP_ONE_HOUR_DELIVERY}
            </span>
            <span className="inline-flex min-h-9 items-center rounded-full border border-line bg-elevated/45 px-3.5 text-[0.8rem] text-muted-foreground">
              {USP_PAYMENT}
            </span>
          </div>
          {/* Active combined filters — each chip clears its own facet. */}
          {isCombined && (
            <div role="group" aria-label="Active filters" className="flex flex-wrap items-center gap-2 pt-4">
              <span className="text-[0.78rem] uppercase tracking-[0.14em] text-muted-foreground">Filtered by</span>
              {activeFilters.map((chip) => (
                <Link
                  key={chip.key}
                  href={chip.href}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-violet-glow/50 bg-violet-glow/15 px-3.5 text-[0.8rem] font-medium text-foreground transition-colors hover:border-violet-glow/80"
                  aria-label={`${chip.label} — clear this filter`}
                >
                  {chip.label}
                  <X className="size-3.5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
          {/* Combined-facet chips — narrow this line by collection or brand. */}
          {collectionChips.length > 0 && (
            <nav aria-label="Narrow by collection" className="pt-4">
              <div
                role="group"
                aria-label="Filter this origin line by collection"
                className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
              >
                {collectionChips.map((chip) => (
                  <Link key={chip.value} href={originHref(slug, facets, { collection: chip.value })} className={facetChipClass}>
                    {chip.label}
                    <span className={facetChipCountClass}>{chip.count}</span>
                  </Link>
                ))}
              </div>
            </nav>
          )}
          {brandChips.length > 0 && (
            <nav aria-label="Narrow by brand" className="pt-4">
              <div
                role="group"
                aria-label="Filter this origin line by brand"
                className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
              >
                {brandChips.map((chip) => (
                  <Link key={chip.value} href={originHref(slug, facets, { brand: chip.value })} className={facetChipClass}>
                    {chip.label}
                    <span className={facetChipCountClass}>{chip.count}</span>
                  </Link>
                ))}
              </div>
            </nav>
          )}
          {/* Cross-navigation between origin landing pages — sibling counts
              reflect the active collection/brand/search scope. */}
          <nav aria-label="Other origin lines" className="flex flex-wrap items-center gap-2 pt-4">
            <span className="text-[0.78rem] uppercase tracking-[0.14em] text-muted-foreground">Other lines</span>
            <OriginFilterChips
              ariaLabel="Switch origin line"
              counts={facetOriginCounts}
              context={facets}
              activeSlug={line.slug}
              className="sm:ml-auto"
            />
          </nav>
        </header>

        <CatalogBrowser
          items={toCardItems(items)}
          emptyTitle={`No TEREA ${line.chipLabel} sticks listed yet`}
          emptyBody={
            isCombined
              ? "This origin line has nothing under the active filters — clear a filter above or browse the full line."
              : "This origin line is being restocked — browse the full range in the meantime."
          }
          loadMoreLabel={`Load more ${line.chipLabel} sticks`}
        />

        <SeoContent
          title={`TEREA ${line.label} — delivery, pricing and the full flavour list`}
          blocks={line.seoBlocks}
          links={otherLines.map((other) => ({
            label: `TEREA ${other.flag} ${other.chipLabel} sticks`,
            href: `/origin/${other.slug}`,
            description: `Compare against the ${line.chipLabel} line with UAE delivery.`,
          }))}
        />

        <div className="py-14">
          <Link
            href="/discover"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 text-sm text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
          >
            Browse the full catalog
          </Link>
        </div>
      </PageContainer>
    </section>
  );
}

const facetChipClass =
  "inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-3.5 text-[0.8rem] text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground";
const facetChipCountClass =
  "rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[0.68rem] font-semibold leading-none";
