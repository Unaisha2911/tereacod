import { FlaskConical, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StoreNotice — honest storefront status marker (exported under the
 * historical PrototypeNotice name so existing call sites keep working).
 * Use it for live-flow notices and short rollout notes.
 */
export function PrototypeNotice({
  children = "Live storefront — real inventory, real accounts, real orders. Checkout is cash or card on delivery across the UAE. 18+ only.",
  variant = "default",
  className,
}: {
  children?: React.ReactNode;
  variant?: "default" | "compact";
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.1em] text-warning",
          className
        )}
      >
        <FlaskConical className="size-3" aria-hidden="true" />
        {children}
      </span>
    );
  }
  return (
    <div
      role="note"
      className={cn("flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning/[0.06] px-4 py-3", className)}
    >
      <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <p className="text-[0.82rem] leading-relaxed text-warning/90">{children}</p>
    </div>
  );
}
