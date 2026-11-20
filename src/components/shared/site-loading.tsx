import { PageContainer } from "@/components/layout/page-container";
import { CardGridSkeleton } from "@/components/shared/loading-indicator";

/**
 * Shared route-level loading skeleton.
 *
 * Scoping note (SEO-critical): a loading.tsx boundary flushes a 200 shell
 * before the segment resolves — under it, notFound() on a DYNAMIC [slug]
 * route can only swap content, never commit a real 404 status (Google
 * reads those as soft-404s). Loading skeletons therefore exist ONLY on
 * routes that always render (static marketing/help/commerce pages and the
 * gated account area). The dynamic shelves — products/[slug],
 * collections/[slug], brand/[slug], origin/[slug] — and the legal documents
 * intentionally have NO loading boundary so unknown slugs hard-block and
 * ship a true 404. Re-export this component from a route loading.tsx to
 * add a skeleton to another always-renders route.
 */
export default function SiteLoading() {
  return (
    <PageContainer>
      <div aria-busy="true" className="pb-20 pt-16">
        <div className="mb-10 space-y-3">
          <div className="skeleton-sheen h-3 w-24 rounded bg-accent" />
          <div className="skeleton-sheen h-9 w-72 max-w-full rounded bg-accent" />
          <div className="skeleton-sheen h-4 w-full max-w-xl rounded bg-accent/60" />
        </div>
        <CardGridSkeleton count={8} />
      </div>
    </PageContainer>
  );
}
