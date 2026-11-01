import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * EmptyState — reusable empty view with optional action.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-line-strong bg-foreground/[0.02] px-6 py-16 text-center", className)}>
      {Icon && (
        <div className="flex size-14 items-center justify-center rounded-2xl border border-line bg-elevated/60">
          <Icon className="size-6 text-violet-soft" aria-hidden="true" />
        </div>
      )}
      <div className="space-y-1.5">
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
        {body && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{body}</p>}
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && !actionHref && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
