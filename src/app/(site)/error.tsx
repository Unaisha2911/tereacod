"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RotateCcw } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";

/**
 * Site error boundary — catches unexpected errors inside the public
 * site layout, so the AppShell chrome (header/footer/smoke) still
 * surrounds the message. Global errors fall through to global-error.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Same logging shape as the root boundary (src/app/error.tsx).
    console.error("Site error boundary:", error.digest ?? error.message);
  }, [error]);

  return (
    <PageContainer className="pb-24 pt-10 sm:pt-14">
      <div
        role="alert"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-5 rounded-3xl border border-line bg-elevated/40 px-6 py-16 text-center"
      >
        <p className="text-label font-semibold uppercase tracking-[0.24em] text-error">Route fault</p>
        <h1 className="max-w-2xl font-display text-[clamp(2rem,6vw,3.5rem)] font-bold leading-tight tracking-tight text-foreground">
          Something broke in the haze
        </h1>
        <p className="max-w-md text-lead text-muted-foreground">
          This section of the shop hit an unexpected error. It has been noted — trying again usually clears it.
        </p>
        {error.digest && (
          <p className="font-mono text-meta text-muted-foreground/70">Reference: {error.digest}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line-strong px-6 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.04]"
          >
            <Home className="size-4" aria-hidden="true" />
            Back to the homepage
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
