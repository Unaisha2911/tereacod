import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BadgeCheck } from "lucide-react";
import { NeonHeading } from "@/components/homepage/neon-heading";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { SectionAtmosphere } from "@/components/atmosphere/section-atmosphere";
import { PageContainer, SectionContainer } from "@/components/layout/page-container";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { BrandCard } from "@/components/shared/brand-card";
import { getBrands, getProducts } from "@/server/data";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "IQOS ILUMA UAE — Every Brand We Stock",
  description:
    "IQOS ILUMA heat-not-burn tobacco sticks in the UAE — all seven sourcing lines from Uzbekistan and Switzerland (Duty Free) to Japan and Italy — authenticity-checked stock, AED pricing and UAE-wide delivery from Dubai.",
  ...canonical("/brand"),
};

export default async function BrandDirectoryPage() {
  // Server data facade — brands with live catalog counts.
  const [brands, products] = await Promise.all([getBrands(), getProducts()]);
  const counts = Object.fromEntries(
    brands.map((brand) => [
      brand.slug,
      products.filter((item) => item.brand.toLowerCase() === brand.name.toLowerCase()).length,
    ]),
  );
  const totalListings = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <PageContainer width="default" className="pb-16 sm:pb-24">
      <h1 className="sr-only">Brands — the TereaCOD TEREA delivery directory</h1>

      <div className="pt-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Brands" }]} />
      </div>

      {/* Directory header */}
      <section className="relative">
        <SectionAtmosphere variant="mixed" intensity={0.45} />
        <div className="relative z-10 flex flex-col gap-5 pb-10 pt-10 sm:pt-14">
          <NeonHeading
            eyebrow="Brand directory"
            title="AUTHENTIC TEREA"
            accent="ONE SHOP."
            tone="mix"
            id="brands-heading"
          />
          <p className="max-w-2xl text-lead text-muted-foreground">
            TereaCOD is the UAE&apos;s TEREA delivery specialist — heat-not-burn tobacco sticks made for
            IQOS ILUMA, delivered UAE-wide with cash or card on delivery and authenticity-checked stock at AED pricing.
          </p>
          <p className="flex items-center gap-2 text-[0.78rem] text-muted-foreground">
            <BadgeCheck className="size-4 shrink-0 text-violet-soft" aria-hidden="true" />
            {totalListings} listings · every record conformity-checked before it ships
          </p>
        </div>
      </section>

      {/* Brand tiles */}
      <SectionContainer spacing="sm" className="pt-2">
        <RevealSection>
          <ul aria-label="TEREA lines stocked at TereaCOD" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <li key={brand.id} className="h-full">
                <BrandCard
                  brand={brand}
                  productCount={counts[brand.slug] ?? 0}
                  className="h-full"
                />
              </li>
            ))}
          </ul>
        </RevealSection>
      </SectionContainer>

      {/* Studio note + closing CTAs */}
      <SectionContainer spacing="sm">
        <RevealSection>
          <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-10">
            <figure className="group relative aspect-[16/9] overflow-hidden rounded-2xl border border-violet-glow/30">
              <Image
                src="/brand/craft.jpg"
                alt="Inside the TereaCOD studio"
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <figcaption className="glass absolute bottom-4 left-4 rounded-full px-3.5 py-1.5 text-meta uppercase tracking-[0.14em] text-foreground/90">
                TereaCOD studio — Dubai
              </figcaption>
            </figure>

            <div>
              <h2 className="font-display text-h2 font-semibold text-foreground">Curated, checked, listed.</h2>
              <p className="mt-3 max-w-md text-legal leading-relaxed text-foreground/85">
                TereaCOD does not make devices — it curates them. Each brand page gathers the full regional range with
                specifications, conformity records and UAE pricing in one place, so comparing a Crown Bar against a
                Pulse X takes seconds, not shop visits.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/collections"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
                >
                  Browse all collections
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 text-sm text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
                >
                  About TereaCOD
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </RevealSection>
      </SectionContainer>
    </PageContainer>
  );
}
