import { Banknote, Truck, Zap } from "lucide-react";
import { USP_FREE_DELIVERY, USP_ONE_HOUR_DELIVERY, USP_PAYMENT } from "@/lib/usp";
import { cn } from "@/lib/utils";

/**
 * UspStrip — the three ordering promises as pills, with the 1-hour
 * delivery promise visually emphasized (violet glow + Zap) everywhere
 * it renders: product page, cart, checkout and the footer.
 *
 * Server-compatible (no hooks) so it can render in any server tree.
 */
export function UspStrip({ className, size = "md" }: {
  className?: string;
  /** md = footer/product pills · sm = tighter cart/checkout rows. */
  size?: "sm" | "md";
}) {
  const pill = cn(
    "inline-flex items-center gap-1.5 rounded-full border whitespace-nowrap",
    size === "sm" ? "min-h-7 px-2.5 text-[0.7rem]" : "min-h-9 px-3.5 text-[0.78rem]"
  );
  return (
    <ul aria-label="Delivery and payment" className={cn("flex flex-wrap items-center gap-2", className)}>
      <li className={cn(pill, "border-line bg-foreground/[0.03] font-medium text-muted-foreground")}>
        <Truck className={cn("shrink-0 text-violet-soft", size === "sm" ? "size-3" : "size-3.5")} aria-hidden="true" />
        {USP_FREE_DELIVERY}
      </li>
      <li
        className={cn(
          pill,
          "border-violet-glow/45 bg-violet-glow/10 font-semibold text-foreground shadow-[0_0_12px_rgba(139,92,246,0.25)]"
        )}
      >
        <Zap className={cn("shrink-0 text-violet-soft", size === "sm" ? "size-3" : "size-3.5")} aria-hidden="true" />
        {USP_ONE_HOUR_DELIVERY}
      </li>
      <li className={cn(pill, "border-line bg-foreground/[0.03] font-medium text-muted-foreground")}>
        <Banknote className={cn("shrink-0 text-violet-soft", size === "sm" ? "size-3" : "size-3.5")} aria-hidden="true" />
        {USP_PAYMENT}
      </li>
    </ul>
  );
}
