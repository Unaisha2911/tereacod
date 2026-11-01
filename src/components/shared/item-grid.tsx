"use client";

import { ItemCard } from "./item-card";
import { EmptyState } from "./empty-state";
import { PackageSearch } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { motion, useReducedMotion } from "framer-motion";
import type { CatalogCardItem } from "@/lib/catalog-card";
import { cn } from "@/lib/utils";

/**
 * ItemGrid — responsive catalog grid with staggered entrance,
 * empty state and column control.
 */
export function ItemGrid({
  items,
  columns = 4,
  emptyTitle = "No items found",
  emptyBody = "Try adjusting your filters or search terms.",
  className,
}: {
  items: CatalogCardItem[];
  columns?: 3 | 4;
  emptyTitle?: string;
  emptyBody?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (items.length === 0) {
    return <EmptyState icon={PackageSearch} title={emptyTitle} body={emptyBody} actionLabel="Browse everything" actionHref="/discover" />;
  }

  return (
    <motion.div
      variants={reduced ? undefined : staggerContainer(0.05)}
      initial={reduced ? undefined : "hidden"}
      animate={reduced ? undefined : "visible"}
      className={cn(
        "grid grid-cols-2 gap-4 sm:gap-5",
        columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        "md:grid-cols-3",
        className
      )}
    >
      {items.map((item, i) => (
        <motion.div key={item.id} variants={reduced ? undefined : staggerItem}>
          <ItemCard item={item} priority={i < 4} />
        </motion.div>
      ))}
    </motion.div>
  );
}
