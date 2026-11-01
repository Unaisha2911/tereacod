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
import { ORIGIN_LINES, originCountsFor, originSlugForItem } from "@/lib/catalog-origin";
import { scrollIntoViewSmooth } from "@/lib/motion";
import type { CatalogCardItem } from "@/lib/catalog-card";
import type { Availability, CatalogCategory } from "@/types";
import { cn } from "@/lib/utils";

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
 * Every filter (collection / origin line / availability / sort) then runs
 * in memory for instant updates. 16 products are revealed per batch behind
 * a single "Load more" control — no numbered pagination anywhere.
 */
export function DiscoverView({
  initialItems,
  initialCategories,
}: {
  initialItems: CatalogCardItem[];
  initialCategories: CatalogCategory[];
}) {
  const router = useRouter();

  const [category, setCategory] = useState("all");
  const [origin, setOrigin] = useState("all");
  const [sort, setSort] = useState<SortValue>("featured");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchValue, setSearchValue] = useState("");

  const items = initialItems;
  const categories = initialCategories;

  const categoryFiltered = useMemo(
    () => (category === "all" ? items : items.filter((item) => item.categorySlug === category)),
    [items, category]
  );
  const originCounts = useMemo(() => originCountsFor(categoryFiltered), [categoryFiltered]);
  const filtered = useMemo(
    () =>
      origin === "all"
        ? categoryFiltered
        : categoryFiltered.filter((item) => originSlugForItem(item) === origin),
    [categoryFiltered, origin]
  );
  const availabilityFiltered = useMemo(
    () => (availability === "all" ? filtered : filtered.filter((item) => item.availability === availability)),
    [filtered, availability]
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
  }, [category, origin, sort, availability]);

  const revealFirstBatch = () => setVisibleCount(PAGE_SIZE);

  const selectCategory = (slug: string) => {
    setCategory(slug);
    revealFirstBatch();
  };

  const resetFilters = () => {
    setCategory("all");
    setOrigin("all");
    setSort("featured");
    setAvailability("all");
    revealFirstBatch();
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  const categoryChips = [{ slug: "all", name: "All" }, ...categories.map((c) => ({ slug: c.slug, name: c.name }))];

  return (
    <PageContainer>
      <PageHeading
        eyebrow="TereaCOD"
        title="Discover the range"
        lead="Every product we stock — heat-not-burn tobacco sticks for IQOS ILUMA across every origin line. Filter by collection, origin, sort and search the full range."
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
            className="absolute right-1.5 inline-flex h-9 items-center rounded-full bg-primary px-5 text-[0.8rem] font-medium text-primary-foreground transition-all hover:brightness-110"
          >
            Search
          </button>
        </div>
      </form>

      {/* Collection chips — horizontally scrollable on small screens */}
      <div
        role="group"
        aria-label="Filter by collection"
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {categoryChips.map((chip) => {
          const active = category === chip.slug;
          return (
            <button
              key={chip.slug}
              type="button"
              aria-pressed={active}
              onClick={() => selectCategory(chip.slug)}
              className={cn(
                "min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-[0.8rem] font-medium transition-colors",
                active
                  ? "border-violet-glow/50 bg-violet-glow/15 text-foreground"
                  : "border-line text-muted-foreground hover:border-line-strong hover:text-foreground"
              )}
            >
              {chip.name}
            </button>
          );
        })}
      </div>

      {/* Origin line chips — filter across the whole sourcing range */}
      <OriginFilterChips
        className="mt-3"
        ariaLabel="Filter by origin line"
        value={origin}
        onChange={(next) => {
          setOrigin(next);
          revealFirstBatch();
        }}
      />

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

      {/* Collections intro — only on the unfiltered view */}
      {category === "all" && origin === "all" && (
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
      )}

      {/* Results — 16 per batch behind a Load more control (no page numbers) */}
      <section ref={resultsRef} aria-label="Catalog results" className="scroll-mt-24 pt-10">
        <p aria-live="polite" className="mb-5 min-h-5 text-[0.8rem] text-muted-foreground">
          {sorted.length > 0
            ? `Showing ${visible.length} of ${sorted.length} ${sorted.length === 1 ? "product" : "products"}`
            : ""}
        </p>

        {sorted.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="Nothing matches these filters"
            body="Try a different category, widen the availability filter, or clear everything and start again."
            actionLabel="Clear filters"
            onAction={resetFilters}
          />
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
              "TereaCOD stocks the complete TEREA heat-not-burn range for IQOS ILUMA — every flavour across the Duty Free (multi-origin), Indonesia and Japan sourcing lines, all shipped from Dubai with UAE-wide delivery. Filter by collection or origin line above, load more to keep browsing, and check out in under a minute with cash or card on delivery.",
              "Same-day dispatch applies to orders placed before the daily cut-off; deliveries reach Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain and Al Ain. Pack pricing starts at AED 45 with any origin premium shown on the listing — never added at the door.",
            ],
          },
          {
            heading: "Compare TEREA origin lines before you order",
            paragraphs: [
              "Every TEREA stick belongs to a sourcing line: the wide multi-origin duty-free range, the Indonesia line (Dimension Series, Golden Edition, Indonesia Pearls) or the Japan line (the menthol benchmark and the Regular family). Each line has a dedicated page with delivery details and flavour guides so you can pick the right profile before checkout.",
            ],
          },
        ]}
        links={[
          ...ORIGIN_LINES.map((line) => ({
            label: `TEREA ${line.chipLabel} sticks`,
            href: `/origin/${line.slug}`,
            description: `The ${line.chipLabel} origin line with UAE delivery.`,
          })),
          {
            label: "Heat-not-burn collection",
            href: "/collections/heat-not-burn",
            description: "The full TEREA shelf on one page.",
          },
          {
            label: "Delivery & payment FAQ",
            href: "/help/faq",
            description: "Cut-off times, COD rules and age verification.",
          },
        ]}
      />

      <div className="pb-8" />
    </PageContainer>
  );
}
