"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { SectionAtmosphere } from "@/components/atmosphere/section-atmosphere";
import { NeonHeading } from "./neon-heading";
import { SectionContainer } from "@/components/layout/page-container";
import { CategoryCard } from "@/components/shared/category-card";
import type { CatalogCategory } from "@/types";

/**
 * ProductCategoriesSection — shop-by-collection grid.
 * Renders every catalog category record through the shared
 * CategoryCard (pointer-tracked glow, accent per category) beneath a
 * neon heading band. Categories are passed in from the
 * server-rendered homepage.
 */
export function ProductCategoriesSection({ CATALOG_CATEGORIES }: { CATALOG_CATEGORIES: CatalogCategory[] }) {
  return (
    <SectionContainer spacing="lg">
      <SectionAtmosphere variant="inferno" intensity={0.55} />

      <section aria-labelledby="categories-heading" className="relative z-10">
        <RevealSection className="flex flex-wrap items-end justify-between gap-6">
          <NeonHeading
            id="categories-heading"
            eyebrow="Product collections"
            title="Shop the"
            accent="collections"
            redAccent
          />
          <Link
            href="/collections"
            className="group inline-flex items-center gap-2 rounded-full border border-line-strong bg-foreground/[0.03] px-5 py-2.5 text-sm font-medium text-foreground shadow-[0_0_12px_rgba(139,92,246,0.12)] transition-all hover:border-violet-glow/55 hover:shadow-[0_0_20px_rgba(139,92,246,0.35)]"
          >
            All collections
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </RevealSection>

        <RevealSection delay={0.06}>
          <p className="mt-5 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">
            From smooth toasted tobaccos to cooling menthols and click-capsule
            Pearl editions — pick a collection, compare flavour profiles and
            origin lines, and find the stick that matches how you heat.
          </p>
        </RevealSection>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {CATALOG_CATEGORIES.map((category, index) => (
            <CategoryCard key={category.id} category={category} index={index} />
          ))}
        </div>
      </section>
    </SectionContainer>
  );
}
