import { PageContainer } from "@/components/layout/page-container";
import { CardGridSkeleton } from "@/components/shared/loading-indicator";

/**
 * Route-level loading skeleton for the whole (site) group.
 *
 * Only /discover and /search shipped their own skeletons before — every
 * other route navigated with a frozen stale page while the async shell
 * resolved. This shared boundary gives the remaining routes instant
 * feedback; a route can still override it with its own loading.tsx.
 */
export default function SiteLoading() {
  return (
    <PageContainer>
      <div aria-busy="true" className="pb-20 pt-16">
        <div className="mb-10 space-y-3">
          <div className="skeleton-sheen h-3 w-24 rounded bg-foreground/[0.05]" />
          <div className="skeleton-sheen h-9 w-72 max-w-full rounded bg-foreground/[0.07]" />
          <div className="skeleton-sheen h-4 w-full max-w-xl rounded bg-foreground/[0.04]" />
        </div>
        <CardGridSkeleton count={8} />
      </div>
    </PageContainer>
  );
}
