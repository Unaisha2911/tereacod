"use client";

import Image from "next/image";
import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * OrderItemImage — fixed 64px product thumbnail with an honest
 * fallback when the asset is missing (catalog records may reference
 * imagery that has not been generated yet).
 */
export function OrderItemImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        "relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-foreground/[0.03]",
        className
      )}
    >
      {src && !failed ? (
        // Eager: on confirmation pages this thumbnail is frequently the
        // largest above-fold image (the LCP element).
        <Image src={src} alt={alt} width={64} height={64} loading="eager" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <Package className="size-6 text-muted-foreground" aria-hidden="true" />
      )}
    </span>
  );
}
