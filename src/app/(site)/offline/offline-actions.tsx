"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

/** Client island — the retry action needs window reload. */
export function OfflineActions() {
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        Retry connection
      </button>
      <Link
        href="/"
        className="inline-flex min-h-12 items-center rounded-full border border-line-strong px-6 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50"
      >
        Go to homepage
      </Link>
    </div>
  );
}
