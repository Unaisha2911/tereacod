"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageSearch, Search } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { PageContainer } from "@/components/layout/page-container";
import { CategoryCard } from "@/components/shared/category-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadMoreGrid } from "@/components/shared/load-more-grid";
import { OriginFilterChips } from "@/components/shared/origin-filter-chips";
import { SeoContent } from "@/components/shared/seo-content";
import { FilterBar } from "@/components/shared/admin-primitives";
import { Select } from "@/components/forms/fields";
import { SORT_OPTIONS, sortCatalogItems, type SortKey } from "@/lib/catalog-sort";
import { ORIGIN_LINES, originCountsFor } from "@/lib/catalog-origin";
import { scrollIntoViewSmooth } from "@/lib/motion";
import type { CatalogCardItem } from "@/lib/catalog-card";
import type { Availability, CatalogCategory } from "@/types";

const PAGE_SIZE = 16;

type SortValue = SortKey;
type AvailabilityFilter = Availability | "all";

const AVAILABILITY_OPTIONS: Array<{ value: AvailabilityFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "in_stock", label: "Available" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];

/**
 * DiscoverView — the full-catalog browsing grid.
 *
 * The catalog arrives SERVER-RENDERED (card projection from the page) —
 * no first-paint spinner, no client catalog download, fully crawlable.
 * Collection and origin filters are LINK chips: each one lands on its
 * dedicated page (/collections/<slug>, /origin/<slug>) — those pages
 * exist for crawling and carry their own combined facets — while sort,
 * availability and Load more stay instant in-memory controls here.
 */
export function DiscoverView({
  initialItems,
  initialCategories,
}: {
  initialItems: CatalogCardItem[];
  initialCategories: CatalogCategory[];
}) {
  const router = useRouter();

  const [sort, setSort] = useState<SortValue>("featured");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchValue, setSearchValue] = useState("");

  const items = initialItems;
  const categories = initialCategories;

  const availabilityFiltered = useMemo(
    () => (availability === "all" ? items : items.filter((item) => item.availability === availability)),
    [items, availability]
  );
  const sorted = useMemo(() => sortCatalogItems(availabilityFiltered, sort), [availabilityFiltered, sort]);
  const visible = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);
  const hasMore = visibleCount < sorted.length;

  // Bring the top of the results into view when the filters change
  // (Load more appends below the fold — no scroll for those).
  const resultsRef = useRef<HTMLElement | null>(null);
  const skipScroll = useRef(true);
  useEffect(() => {
    if (skipScroll.current) {
      skipScroll.current = false;
      return;
    }
    scrollIntoViewSmooth(resultsRef.current);
  }, [sort, availability]);

  const revealFirstBatch = () => setVisibleCount(PAGE_SIZE);

  const resetFilters = () => {
    setSort("featured");
    setAvailability("all");
    revealFirstBatch();
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  // Facet counts over the whole shelf — multi-origin listings count
  // toward every line they stock.
  const originCounts = useMemo(() => originCountsFor(items), [items]);

  return (
    <PageContainer>
      <PageHeading
        eyebrow="TereaCOD"
        title="Discover the range"
        lead="Every product we stock — heat-not-burn tobacco sticks for IQOS ILUMA across every origin line. Collection and origin filters land on their dedicated pages; availability and sort narrow the grid instantly."
      />

      {/* Search entry — navigates to the dedicated search route */}
      <form role="search" onSubmit={onSearchSubmit} className="pb-8">
        <div className="relative flex max-w-xl items-center">
          <Search className="pointer-events-none absolute left-4 size-[1.05rem] text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search products, flavours, collections…"
            aria-label="Search the catalog"
            className="h-12 w-full rounded-full border border-line bg-foreground/[0.03] pl-11 pr-24 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-violet-glow/50 focus:outline-none"
          />
          <button
            type="submit"
            className="absolute right-1.5 inline-flex h-9 items-center rounded-full bg-primary px-5 text-[0.8rem] font-medium text-primary-foreground transition-[filter] hover:brightness-110"
          >
            Search
          </button>
        </div>
      </form>

      {/* Collection chips — each lands on the collection's own page */}
      <div
        role="group"
        aria-label="Browse collections"
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/collections/${c.slug}`}
            className="min-h-11 shrink-0 whitespace-nowrap rounded-full border border-line px-4 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
          >
            {c.name}
          </Link>
        ))}
      </div>

      {/* Origin line chips — each lands on the line's dedicated page */}
      <OriginFilterChips className="mt-3" ariaLabel="Shop by origin line" counts={originCounts} />

      {/* Sort + availability controls */}
      <div className="mb-10 mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2.5 text-[0.8rem] text-muted-foreground">
          <span>Sort</span>
          <Select
            aria-label="Sort items"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortValue);
              revealFirstBatch();
            }}
            className="h-11 w-44 text-[0.8rem]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <FilterBar
          options={AVAILABILITY_OPTIONS}
          value={availability}
          onChange={(next) => {
            setAvailability(next);
            revealFirstBatch();
          }}
          ariaLabel="Filter by availability"
        />
      </div>

      {/* Collections intro — every collection card, always in view */}
      <section aria-labelledby="collections-heading" className="pb-4">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="collections-heading" className="font-display text-h3 font-semibold text-foreground">
            Collections
          </h2>
          <Link
            href="/collections"
            className="shrink-0 text-[0.8rem] text-muted-foreground transition-colors hover:text-foreground"
          >
            All collections
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {categories.map((c, i) => (
            <CategoryCard key={c.id} category={c} index={i} />
          ))}
        </div>
      </section>

      {/* Results — 16 per batch behind a Load more control (no page numbers) */}
      <section ref={resultsRef} aria-label="Catalog results" className="scroll-mt-28 pt-10">
        <p aria-live="polite" className="mb-5 min-h-5 text-[0.8rem] text-muted-foreground">
          {sorted.length > 0
            ? `Showing ${visible.length} of ${sorted.length} ${sorted.length === 1 ? "product" : "products"}`
            : ""}
        </p>

        {sorted.length === 0 ? (
          items.length === 0 ? (
            // The catalog itself is empty — not a filter problem.
            <EmptyState
              icon={PackageSearch}
              title="Our shelf is being restocked"
              body="The first TEREA drop lands here shortly — check back soon or contact us in the meantime."
              actionLabel="Contact us"
              actionHref="/contact"
            />
          ) : (
            <EmptyState
              icon={PackageSearch}
              title="Nothing matches these filters"
              body="Try widening the availability filter, or clear everything and start again."
              actionLabel="Clear filters"
              onAction={resetFilters}
            />
          )
        ) : (
          <LoadMoreGrid
            items={visible}
            total={sorted.length}
            hasMore={hasMore}
            onLoadMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
            columns={3}
          />
        )}
      </section>

      {/* Below-the-fold editorial copy — indexed on the unfiltered shelf. */}
      <SeoContent
        title="TEREA delivery UAE — the full range with cash on delivery"
        blocks={[
          {
            heading: "Order TEREA sticks online with delivery across the UAE",
            paragraphs: [
              "TereaCOD stocks the complete TEREA heat-not-burn range for IQOS ILUMA — every flavour across all seven sourcing lines (Uzbekistan, Tajikistan, Kyrgyzstan, Indonesia, Switzerland duty-free, Japan and Italy), all shipped from Dubai with UAE-wide delivery. Open any collection or origin line above to browse its dedicated page, load more to keep browsing, and check out in under a minute with cash or card on delivery.",
              "Same-day dispatch applies to orders placed before the daily cut-off; deliveries reach Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain and Al Ain. Pack pricing starts at AED 45 with any origin premium shown on the listing — never added at the door.",
            ],
          },
          {
            heading: "Compare TEREA origin lines before you order",
            paragraphs: [
              "Every TEREA stick belongs to a sourcing line: the wide Swiss duty-free range, the Indonesia line (Dimension Series, Golden Edition, Indonesia Pearls), the Japan line (the menthol benchmark and the Regular family) and the Uzbekistan, Tajikistan, Kyrgyzstan and Italy lines for the classic toasted profiles. Each line has a dedicated page with delivery details and flavour guides so you can pick the right profile before checkout.",
            ],
          },
        ]}
        links={ORIGIN_LINES.map((line) => ({
          label: `TEREA ${line.flag} ${line.chipLabel} sticks`,
          href: `/origin/${line.slug}`,
          description: `The ${line.chipLabel} origin line with UAE delivery.`,
        }))}
      />

      <div className="pb-8" />
    </PageContainer>
  );
}
