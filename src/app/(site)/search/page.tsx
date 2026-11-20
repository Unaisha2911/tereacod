import { Suspense } from "react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { CardGridSkeleton } from "@/components/shared/loading-indicator";
import { getCategories } from "@/server/data";
import { SearchView } from "./search-view";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Search",
  description: "Search the TereaCOD catalog — heat-not-burn tobacco sticks and accessories, with live suggestions.",
};

/**
 * Search — the ONLY client API surface here is the query itself
 * (/api/v1/search + /search/suggest while typing). The popular-collection
 * chips render from server-provided categories: the former on-mount
 * GET /catalog/categories is gone (one less request per search visit,
 * and the chips paint with the first HTML instead of after hydration).
 */
export default async function SearchPage() {
  // Cached taxonomy read (60s) — one small D1 query per cold cache.
  const categories = await getCategories().catch(() => []);

  return (
    <PageContainer>
      {/* Suspense boundary is required: SearchView reads useSearchParams. */}
      <Suspense
        fallback={
          <div aria-busy="true" className="pb-20 pt-16">
            <CardGridSkeleton count={4} />
          </div>
        }
      >
        <SearchView initialCategories={categories} />
      </Suspense>
    </PageContainer>
  );
}
