"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { NeonHeading } from "./neon-heading";
import { SectionContainer } from "@/components/layout/page-container";
import { ItemGrid } from "@/components/shared/item-grid";
import type { CatalogCardItem } from "@/lib/catalog-card";

/**
 * CollectionPreview — trending products strip (the "Products" band).
 * Filters the catalog on featured === true and renders through the
 * shared ItemGrid beneath the neon products heading. Catalog items are
 * passed in from the server-rendered homepage.
 */
export function CollectionPreview({ CATALOG_ITEMS }: { CATALOG_ITEMS: CatalogCardItem[] }) {
  // Featured catalog records — capped at eight for the homepage strip.
  const FEATURED_ITEMS = CATALOG_ITEMS.filter((item) => item.featured).slice(0, 8);
  return (
    <SectionContainer spacing="lg">
      {/* Perf trim: the per-section smoke layer was removed — the fixed
          page-level ambient smoke already carries the atmosphere here. */}
      <section id="products" aria-labelledby="collection-heading" className="relative z-10 scroll-mt-28">
        <RevealSection className="flex flex-wrap items-end justify-between gap-6">
          <NeonHeading
            id="collection-heading"
            eyebrow="Featured TEREA sticks"
            title="Trending"
            accent="now"
          />
          <Link
            href="/discover"
            className="group inline-flex items-center gap-2 rounded-full border border-line-strong bg-foreground/[0.03] px-5 py-2.5 text-sm font-medium text-foreground shadow-[0_0_12px_rgba(139,92,246,0.12)] transition-[border-color,box-shadow] hover:border-violet-glow/55 hover:shadow-[0_0_20px_rgba(139,92,246,0.35)]"
          >
            Shop all TEREA sticks
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </RevealSection>

        <RevealSection delay={0.06}>
          <p className="mt-5 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">
            The heat-not-burn sticks UAE customers are ordering
            right now — every listing authenticity-checked, priced in AED and
            ready for same-day dispatch from our Dubai warehouse.
          </p>
        </RevealSection>

        <div className="mt-10">
          <ItemGrid items={FEATURED_ITEMS} columns={4} />
        </div>
      </section>
    </SectionContainer>
  );
}
