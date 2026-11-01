import { Suspense } from "react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { CardGridSkeleton } from "@/components/shared/loading-indicator";
import { SearchView } from "./search-view";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Search",
  description: "Search the TereaCOD catalog — heat-not-burn tobacco sticks and accessories, with live suggestions.",
};

export default function SearchPage() {
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
        <SearchView />
      </Suspense>
    </PageContainer>
  );
}
