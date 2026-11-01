import { AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ErrorState — reusable error view with retry hook.
 */
export function ErrorState({
  title = "Something went wrong",
  body = "An unexpected error occurred while loading this content. Your connection or the service may be unavailable.",
  retryLabel = "Try again",
  onRetry,
  className,
}: {
  title?: string;
  body?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-4 rounded-3xl border border-error/25 bg-error/[0.04] px-6 py-14 text-center", className)}>
      <div className="flex size-14 items-center justify-center rounded-2xl border border-error/30 bg-error/10">
        <AlertTriangle className="size-6 text-error" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{body}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-6 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.04]"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
