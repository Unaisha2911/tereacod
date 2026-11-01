"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

/**
 * Admin error boundary — deliberately simple and calm: a padded panel
 * with the message and a retry. It must NOT import AdminShell (the
 * admin layout already provides the chrome; nesting shells here would
 * break the nav during fault recovery).
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error boundary:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="p-6 sm:p-10">
      <div
        role="alert"
        className="mx-auto max-w-lg rounded-2xl border border-line bg-elevated/50 p-6 sm:p-8"
      >
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-warning">Admin panel</p>
        <h1 className="mt-2 font-display text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This admin screen hit an unexpected error and could not finish rendering. Retrying reloads the section in
          place — no records are affected.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[0.72rem] text-muted-foreground/70">Reference: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong px-5 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.04]"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Retry
        </button>
      </div>
    </div>
  );
}
