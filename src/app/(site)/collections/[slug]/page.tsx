import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SectionAtmosphere } from "@/components/atmosphere/section-atmosphere";
import { CatalogBrowser } from "@/components/shared/catalog-browser";
import { toCardItems } from "@/lib/catalog-card";
import { SeoContent } from "@/components/shared/seo-content";
import { getCategories, getCategoryBySlugRepo, getProducts } from "@/server/data";
import { ORIGIN_LINES } from "@/lib/catalog-origin";
import { breadcrumbJsonLd, canonical, itemListJsonLd, JsonLd, siteUrl } from "@/lib/seo";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await getCategories()).map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlugRepo(slug);
  // notFound() in metadata (head-blocking) — see products/[slug] note; a
  // streamed-body notFound() would be softened to a 200 by loading.tsx.
  if (!category) notFound();
  const items = (await getProducts()).filter((item) => item.categorySlug === category.slug);
  const title = `${category.name} UAE — Browse ${items.length} products`;
  const description = `${category.description} Shop ${items.length} ${category.name.toLowerCase()} delivered UAE-wide from Dubai — AED pricing, freshness-sealed stock and UAE-wide delivery from Dubai.`;
  return {
    title,
    description,
    keywords: [
      `${category.name} uae`,
      `${category.name} dubai`,
      `buy ${category.name.toLowerCase()} online uae`,
      "terea delivery uae",
      "terea cash on delivery",
    ],
    ...canonical(`/collections/${category.slug}`),
    // Shallow-merge replaces the layout OG object — restate the fallback art.
    openGraph: {
      title,
      description,
      url: siteUrl(`/collections/${category.slug}`),
      type: "website",
      siteName: "TereaCOD",
      locale: "en_AE",
      images: [{ url: siteUrl("/og-image.jpg"), width: 1200, height: 630, alt: `TereaCOD — ${category.name} UAE` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteUrl("/og-image.jpg")],
    },
  };
}

/** Collection detail — every stocked product on one category shelf.
 *
 *  Listing UX: origin-line filter chips + sort + a 16-per-batch "Load
 *  more" grid (no numbered pagination). SEO: ItemList JSON-LD up top,
 *  keyword-rich editorial copy below the Load more control, plus origin
 *  landing-page links so crawlers can reach /origin/* from every shelf. */
export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlugRepo(slug);
  if (!category) notFound();

  const items = (await getProducts()).filter((item) => item.categorySlug === category.slug);

  return (
    <section className="relative">
      <SectionAtmosphere variant="violet" intensity={0.45} />
      {/* BreadcrumbList + ItemList rich results mirror the visible shelf. */}
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { label: "Home", href: "/" },
            { label: "Collections", href: "/collections" },
            { label: category.name },
          ]),
          itemListJsonLd(items, `${category.name} — TereaCOD UAE`),
        ]}
      />
      <PageContainer className="relative z-10">
        <div className="pt-6">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Collections", href: "/collections" },
              { label: category.name },
            ]}
          />
        </div>

        <header className="max-w-2xl pb-8 pt-8">
          <p className="text-label font-medium uppercase tracking-[0.22em] text-violet-soft">Shop collection</p>
          <h1 className="pt-3 text-h1 font-bold">{category.name}</h1>
          <p className="pt-4 text-lead text-muted-foreground">{category.longDescription ?? category.description}</p>
          <div className="flex flex-wrap items-center gap-2 pt-6">
            <span className="inline-flex min-h-9 items-center rounded-full border border-line bg-elevated/45 px-3.5 text-[0.8rem] text-muted-foreground">
              {items.length} {items.length === 1 ? "product" : "products"}
            </span>
            <span className="inline-flex min-h-9 items-center rounded-full border border-line bg-elevated/45 px-3.5 text-[0.8rem] text-muted-foreground">
              Multiple origin lines
            </span>
          </div>
          {/* Origin landing pages — crawlable facet links from every shelf. */}
          <nav aria-label="Shop by origin line" className="flex flex-wrap items-center gap-2 pt-4">
            <span className="text-[0.78rem] uppercase tracking-[0.14em] text-muted-foreground">Origin lines</span>
            {ORIGIN_LINES.map((line) => (
              <Link
                key={line.slug}
                href={`/origin/${line.slug}`}
                className="inline-flex min-h-9 items-center rounded-full border border-line px-3.5 text-[0.8rem] text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
              >
                {line.chipLabel}
              </Link>
            ))}
          </nav>
        </header>

        <CatalogBrowser
          items={toCardItems(items)}
          showOriginFilter
          emptyTitle="Nothing in this collection yet"
          emptyBody="New records are added as their documentation completes. Explore the full range in the meantime."
        />

        <SeoContent
          title={`${category.name} delivered across the UAE`}
          blocks={[
            {
              heading: "TEREA delivery to every emirate",
              paragraphs: [
                "Every listing on this shelf ships from our Dubai warehouse with UAE-wide delivery — Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain and Al Ain. Orders placed before the daily cut-off are dispatched the same day, and packs arrive factory-sealed with AED pricing shown up front, so the price you see is the price you pay at the door.",
                "Use the origin filter above to narrow the shelf to a single sourcing line — Duty Free (Multi), Indonesia or Japan — or load more to keep browsing. Each origin line has its own landing page with delivery details, flavour guides and per-line pricing.",
              ],
            },
            {
              heading: "Cash on delivery or card on delivery",
              paragraphs: [
                "TereaCOD is built around COD — cash on delivery or card on delivery at your door. No prepayment, no card fees and no account required: pick your flavour, choose your origin line, and pay the courier when the order arrives. Card terminals travel with every driver, so you can tap, insert or pay cash in one stop.",
                "Every pack of 20 sticks is priced from AED 45 with any origin-line premium shown on the listing and confirmed at checkout — never added at the door. Age verification applies on delivery in line with UAE tobacco rules.",
              ],
            },
            {
              heading: "Why order from TereaCOD",
              paragraphs: [
                "TereaCOD stocks only IQOS ILUMA-compatible TEREA sticks sourced through verified channels, with every listing stating its origin line, pack format and flavour profile in plain language. Stock levels update in real time, out-of-pack lines are hidden from quick-add, and support is one WhatsApp message away if you need a hand choosing between lines.",
              ],
            },
          ]}
          links={[
            ...ORIGIN_LINES.map((line) => ({
              label: `TEREA ${line.chipLabel} sticks`,
              href: `/origin/${line.slug}`,
              description: `Shop the ${line.chipLabel} origin line with UAE delivery.`,
            })),
            {
              label: "IQOS ILUMA brand page",
              href: "/brand/iqos-iluma",
              description: "The full TEREA range from one verified supplier network.",
            },
            {
              label: "Browse the full catalog",
              href: "/discover",
              description: "Filter, sort and search every product we stock.",
            },
          ]}
        />

        <div className="flex py-14">
          <Link
            href="/collections"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 text-sm text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
            aria-label="Back to all collections"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to collections
          </Link>
        </div>
      </PageContainer>
    </section>
  );
}
