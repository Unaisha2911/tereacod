"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { GradientBackdrop } from "@/components/atmosphere/gradient-backdrop";
import { RotateCcw, LifeBuoy } from "lucide-react";

/**
 * Global error boundary — catches unexpected runtime errors.
 * Offers a retry (resets the boundary) and a help path.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Frontend-only build: surface the digest for support conversations.
    console.error("Unhandled application error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <GradientBackdrop />
      <header className="p-6 sm:p-8">
        <Logo />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <p className="text-label font-semibold uppercase tracking-[0.24em] text-error">Unexpected error</p>
        <h1 className="mt-4 font-display text-[clamp(2.5rem,8vw,5rem)] font-bold leading-tight tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-6 max-w-md text-lead text-muted-foreground">
          An unexpected error interrupted this page. It has been noted — trying again usually resolves it.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-meta text-muted-foreground/70">Reference: {error.digest}</p>
        )}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/help"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line-strong px-6 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.04]"
          >
            <LifeBuoy className="size-4" aria-hidden="true" />
            Get help
          </Link>
        </div>
      </main>
    </div>
  );
}
