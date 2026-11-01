import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * LoadingIndicator — accessible inline loading feedback.
 */
export function LoadingIndicator({ label = "Loading", className, size = "default" }: {
  label?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-3 text-muted-foreground", className)}>
      <Loader2
        aria-hidden="true"
        className={cn("animate-spin text-violet-soft", size === "sm" && "size-4", size === "default" && "size-5", size === "lg" && "size-7")}
      />
      <span className="text-sm">{label}…</span>
      <span className="sr-only">Please wait.</span>
    </div>
  );
}

/** Card-grid skeleton used across catalog and list views. */
export function CardGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4", className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-sheen rounded-2xl border border-line bg-elevated/40 p-4">
          <div className="aspect-square w-full rounded-xl bg-foreground/[0.04]" />
          <div className="mt-4 h-3 w-1/3 rounded bg-foreground/[0.06]" />
          <div className="mt-2.5 h-4 w-2/3 rounded bg-foreground/[0.08]" />
          <div className="mt-4 h-3 w-1/2 rounded bg-foreground/[0.04]" />
        </div>
      ))}
    </div>
  );
}
