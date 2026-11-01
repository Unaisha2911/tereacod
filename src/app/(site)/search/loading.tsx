import { PageContainer } from "@/components/layout/page-container";
import { CardGridSkeleton } from "@/components/shared/loading-indicator";

/** Route-level loading skeleton for /search. */
export default function SearchLoading() {
  return (
    <PageContainer>
      <div aria-busy="true" className="pb-20 pt-16">
        <div className="mb-10 space-y-3">
          <div className="skeleton-sheen h-3 w-24 rounded bg-foreground/[0.05]" />
          <div className="skeleton-sheen h-9 w-56 max-w-full rounded bg-foreground/[0.07]" />
          <div className="skeleton-sheen h-14 w-full max-w-2xl rounded-2xl bg-foreground/[0.04]" />
        </div>
        <CardGridSkeleton count={8} />
      </div>
    </PageContainer>
  );
}
