import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SectionAtmosphere } from "@/components/atmosphere/section-atmosphere";
import { CatalogBrowser } from "@/components/shared/catalog-browser";
import { toCardItems } from "@/lib/catalog-card";
import { SeoContent } from "@/components/shared/seo-content";
import { getProducts } from "@/server/data";
import { ORIGIN_LINES, originLineBySlug, originLineForItem } from "@/lib/catalog-origin";
import { breadcrumbJsonLd, canonical, itemListJsonLd, JsonLd, siteUrl } from "@/lib/seo";

interface OriginPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ORIGIN_LINES.map((line) => ({ slug: line.slug }));
}

export async function generateMetadata({ params }: OriginPageProps): Promise<Metadata> {
  const { slug } = await params;
  const line = originLineBySlug(slug);
  if (!line) notFound();
  const items = (await getProducts()).filter((item) => originLineForItem(item)?.slug === line.slug);
  const title = `${line.metaTitle.split("|")[0].trim()} — ${items.length} products`;
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
 *  origin lines for cross-navigation and editorial SEO copy below. */
export default async function OriginPage({ params }: OriginPageProps) {
  const { slug } = await params;
  const line = originLineBySlug(slug);
  if (!line) notFound();

  const allItems = await getProducts();
  const items = allItems.filter((item) => originLineForItem(item)?.slug === line.slug);
  const otherLines = ORIGIN_LINES.filter((other) => other.slug !== line.slug);

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
              UAE-wide delivery
            </span>
            <span className="inline-flex min-h-9 items-center rounded-full border border-line bg-elevated/45 px-3.5 text-[0.8rem] text-muted-foreground">
              Cash or card on delivery
            </span>
          </div>
          {/* Cross-navigation between origin landing pages. */}
          <nav aria-label="Other origin lines" className="flex flex-wrap items-center gap-2 pt-4">
            <span className="text-[0.78rem] uppercase tracking-[0.14em] text-muted-foreground">Other lines</span>
            {otherLines.map((other) => (
              <Link
                key={other.slug}
                href={`/origin/${other.slug}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[0.8rem] text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
              >
                <span aria-hidden="true">{other.flag}</span>
                {other.chipLabel}
              </Link>
            ))}
          </nav>
        </header>

        <CatalogBrowser
          items={toCardItems(items)}
          emptyTitle={`No TEREA ${line.chipLabel} sticks listed yet`}
          emptyBody="This origin line is being restocked — browse the full range in the meantime."
          loadMoreLabel={`Load more ${line.chipLabel} sticks`}
        />

        <SeoContent
          title={`TEREA ${line.label} — delivery, pricing and the full flavour list`}
          blocks={line.seoBlocks}
          links={[
            ...otherLines.map((other) => ({
              label: `TEREA ${other.flag} ${other.chipLabel} sticks`,
              href: `/origin/${other.slug}`,
              description: `Compare against the ${line.chipLabel} line with UAE delivery.`,
            })),
            {
              label: "Heat-not-burn collection",
              href: "/collections/heat-not-burn",
              description: "The full TEREA shelf with an origin filter.",
            },
            {
              label: "Delivery & payment FAQ",
              href: "/help/faq",
              description: "Cut-off times, COD rules and age verification.",
            },
          ]}
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
