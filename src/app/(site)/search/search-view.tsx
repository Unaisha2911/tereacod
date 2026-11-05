"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PackageSearch, Search, X } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { LoadMoreGrid } from "@/components/shared/load-more-grid";
import { OriginFilterChips } from "@/components/shared/origin-filter-chips";
import { catalogService } from "@/services/catalog";
import { originCountsFor } from "@/lib/catalog-origin";
import { cn } from "@/lib/utils";
import type { CatalogCategory, CatalogItem } from "@/types";

const PAGE_SIZE = 16;

interface Suggestion {
  slug: string;
  name: string;
  category: string;
}

interface ResultsState {
  /** `${committedQ}:${retryTick}#${page}` of the last completed request. */
  key: string;
  status: "ready" | "error";
  /** Accumulated results across Load more batches. */
  items: CatalogItem[];
  total: number;
  hasMore: boolean;
}

export function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = (searchParams.get("q") ?? "").trim();

  const [input, setInput] = useState(initialQ);
  const [committedQ, setCommittedQ] = useState(initialQ);
  const [suggestions, setSuggestions] = useState<{ q: string; items: Suggestion[] } | null>(null);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<ResultsState>({
    key: "",
    status: "ready",
    items: [],
    total: 0,
    hasMore: false,
  });
  const [retryTick, setRetryTick] = useState(0);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const typedQ = input.trim();
  const filtersKey = `${committedQ}:${retryTick}`;
  const requestKey = `${filtersKey}#${page}`;
  const hasQuery = typedQ !== "" || committedQ !== "";
  const searching = hasQuery && (committedQ === "" || results.key !== requestKey);
  const initialLoading = searching && page === 1;
  const appending = searching && page > 1;

  const categoryName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name ?? slug.replace(/-/g, " ");

  // Popular-collection chips + suggestion labels resolve through the
  // catalog service (no direct @/data imports in client views).
  useEffect(() => {
    let cancelled = false;
    catalogService
      .categories()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync the input into the URL (q param) on a short debounce. A new
  // committed query always restarts from the first Load more batch.
  useEffect(() => {
    const timer = setTimeout(() => {
      const q = input.trim();
      setCommittedQ(q);
      setPage(1);
      router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search", { scroll: false });
    }, 250);
    return () => clearTimeout(timer);
  }, [input, router]);

  // Live suggestions while typing — slightly faster than the results commit.
  // In-flight fetches are aborted on the next keystroke so fast typers do
  // not leave a trail of server work behind them.
  useEffect(() => {
    const q = input.trim();
    if (!q) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      catalogService
        .suggest(q, 6, controller.signal)
        .then((items) => {
          if (!cancelled) {
            setSuggestions({ q, items });
            // Fresh list content → reset the listbox highlight alongside
            // the state change (not in an effect) to avoid a cascade.
            setActiveSuggestion(-1);
          }
        })
        .catch(() => {
          if (!cancelled) setSuggestions({ q, items: [] });
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [input]);

  // Full results once submitted or debounced — accumulated per Load more
  // batch (append only when the previous request was the same query one
  // page back; a new query replaces from page 1). A failed append keeps
  // the last-good list and reverts the page, so the next Load more click
  // retries the same batch.
  useEffect(() => {
    if (!committedQ) return;
    if (results.key === requestKey) return; // batch already loaded — nothing to fetch
    let cancelled = false;
    const controller = new AbortController();
    catalogService
      .items({ query: committedQ, page, pageSize: PAGE_SIZE }, controller.signal)
      .then((data) => {
        if (cancelled) return;
        setResults((prev) => {
          const append = page > 1 && prev.key === `${filtersKey}#${page - 1}` && prev.status === "ready";
          return {
            key: requestKey,
            status: "ready",
            items: append ? [...prev.items, ...data.items] : data.items,
            total: data.total,
            hasMore: data.hasMore,
          };
        });
      })
      .catch(() => {
        if (cancelled) return;
        setResults((prev) => {
          if (page > 1 && prev.key.startsWith(`${filtersKey}#`) && prev.status === "ready") {
            return { ...prev, hasMore: true }; // keep the last-good list + key
          }
          return { key: requestKey, status: "error", items: [], total: 0, hasMore: false };
        });
        if (page > 1) setPage(page - 1); // revert so the next click retries this batch
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [committedQ, retryTick, page, filtersKey, requestKey, results.key]);

  const suggestionsVisible =
    typedQ !== "" && typedQ !== committedQ && suggestions?.q === typedQ && suggestions.items.length > 0;

  // Origin facet — LINK chips that land on the line's dedicated page with
  // the search query carried along (?q=…), so the origin page opens as
  // the combined search × origin view. Counts are computed from the
  // accumulated result batches (multi-origin listings count toward every
  // line they stock).
  const originCounts = useMemo(
    () => (results.status === "ready" ? originCountsFor(results.items) : undefined),
    [results]
  );

  const clearAll = () => {
    setInput("");
    setCommittedQ("");
    setSuggestions(null);
    setActiveSuggestion(-1);
    setPage(1);
    setResults({ key: "", status: "ready", items: [], total: 0, hasMore: false });
    router.replace("/search", { scroll: false });
    inputRef.current?.focus();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCommittedQ(typedQ);
    setPage(1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      clearAll();
      return;
    }
    // ARIA combobox pattern: arrow through the suggestion listbox, Enter
    // follows the highlighted option, everything else keeps caret behaviour.
    if (suggestionsVisible && suggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestion((i) => (i + 1) % suggestions.items.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestion((i) => (i <= 0 ? suggestions.items.length - 1 : i - 1));
      } else if (e.key === "Enter" && activeSuggestion >= 0) {
        e.preventDefault();
        const picked = suggestions.items[activeSuggestion];
        if (picked) router.push(`/products/${picked.slug}`);
      }
    }
  };

  return (
    <div className="pb-20">
      <PageHeading
        eyebrow="Catalog"
        title="Search"
        lead="Find heat-not-burn sticks and accessories across the full TereaCOD range. Suggestions appear as you type; results settle just after."
      />

      <div className="relative max-w-2xl">
        <form role="search" onSubmit={onSubmit} className="relative">
          <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search devices, liquids, accessories…"
            aria-label="Search the catalog"
            role="combobox"
            aria-expanded={suggestionsVisible}
            aria-controls="search-suggestions"
            aria-autocomplete="list"
            aria-activedescendant={suggestionsVisible && activeSuggestion >= 0 ? `search-suggestion-${activeSuggestion}` : undefined}
            autoFocus
            className="h-14 w-full rounded-full border border-line bg-foreground/[0.03] pl-14 pr-14 text-lg text-foreground placeholder:text-muted-foreground/60 focus:border-violet-glow/60 focus:outline-none"
          />
          {input !== "" && (
            <button
              type="button"
              onClick={clearAll}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground before:absolute before:-inset-2 before:rounded-full before:content-['']"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </form>

        {suggestionsVisible && (
          <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-line bg-[color:var(--bg-2)] shadow-xl shadow-black/40">
            <p className="px-4 pb-1 pt-3 text-label font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Suggestions
            </p>
            <ul id="search-suggestions" role="listbox" aria-label="Search suggestions" className="p-2 pt-1">
              {suggestions.items.map((s, i) => (
                <li key={s.slug} role="option" id={`search-suggestion-${i}`} aria-selected={i === activeSuggestion}>
                  <Link
                    href={`/products/${s.slug}`}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-foreground/[0.05]",
                      i === activeSuggestion && "bg-foreground/[0.08]"
                    )}
                  >
                    <span className="min-w-0 truncate">{s.name}</span>
                    <span className="shrink-0 text-meta uppercase tracking-[0.12em] text-muted-foreground">
                      {categoryName(s.category)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {!hasQuery ? (
        <div className="mt-10 flex flex-col items-center gap-5 rounded-3xl border border-dashed border-line-strong bg-foreground/[0.02] px-6 py-14 text-center">
          <h2 className="font-display text-lg font-semibold text-foreground">Search the TereaCOD catalog</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Look up any device, liquid or accessory. Results update as you type, and every result links to the full
            product listing.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-meta uppercase tracking-[0.14em] text-muted-foreground">Popular collections</span>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/collections/${c.slug}`}
                className="inline-flex min-h-9 items-center rounded-full border border-line px-3.5 text-[0.8rem] text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="pt-10">
          <p aria-live="polite" className="mb-6 min-h-5 text-[0.8rem] text-muted-foreground">
            {searching
              ? "Searching the catalog…"
              : results.status === "ready"
                ? `${results.total} ${results.total === 1 ? "result" : "results"} for “${committedQ}”`
                : ""}
          </p>

          {/* Origin facet — links to the line's dedicated page with the
              query carried along (search × origin combined view). */}
          {results.status === "ready" && results.items.length > 0 && (
            <OriginFilterChips
              className="mb-8"
              ariaLabel="Shop search results by origin line"
              counts={originCounts}
              context={{ q: committedQ }}
            />
          )}

          {initialLoading ? (
            <LoadingIndicator label="Searching the catalog" className="py-16" />
          ) : results.status === "error" ? (
            <ErrorState onRetry={() => setRetryTick((t) => t + 1)} />
          ) : results.status === "ready" && results.items.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title={`No matches for “${committedQ}”`}
              body="Check the spelling or try a broader term — product names, brands and collections are all searchable."
              actionLabel="Clear search"
              onAction={clearAll}
            />
          ) : results.status === "ready" ? (
            <LoadMoreGrid
              items={results.items}
              total={results.total}
              hasMore={results.hasMore}
              loading={appending}
              onLoadMore={() => setPage((p) => p + 1)}
              columns={4}
              loadMoreLabel="Load more results"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
