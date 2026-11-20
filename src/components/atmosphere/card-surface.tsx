import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * CardSurface — plain polymorphic card shell (the former GlowSurface minus
 * the pointer-tracked radial hover glow, which was retired with the neon
 * design layer). Renders the layout element itself (borders, radius, hover
 * border colour all ride on `className`) and exposes `group/card` so
 * children can keep their group-hover affordances.
 */
export function CardSurface({
  as = "div" as ElementType,
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}) {
  const Host = as as ElementType;
  return <Host className={cn("group/card", className)}>{children}</Host>;
}
