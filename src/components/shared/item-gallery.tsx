"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ImageOff, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ItemGallery — product image gallery with thumbnails and an
 * accessible zoom dialog (Radix provides focus management; the
 * dialog image is labelled and closable via keyboard).
 *
 * `highlightImage` — per-variant photo (colour/origin). When set it is
 * promoted to the front of the list so the main image and thumbnails
 * follow the visitor's selection; clearing it restores the catalog order.
 */
export function ItemGallery({
  images,
  name,
  highlightImage,
}: {
  images: string[];
  name: string;
  /** Selected variant's photo, when the product defines one. */
  highlightImage?: string;
}) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  // Selection swaps: jump to the promoted photo (and reset stale failures).
  // Render-time state adjustment — the sanctioned alternative to a setState
  // effect, which would cascade renders.
  const [prevHighlight, setPrevHighlight] = useState(highlightImage);
  if (prevHighlight !== highlightImage) {
    setPrevHighlight(highlightImage);
    setActive(0);
    setFailed({});
  }

  const safeImages = useMemo(() => {
    const base = images.length > 0 ? images : ["/products/placeholder-missing.jpg"];
    if (!highlightImage) return base;
    return [highlightImage, ...base.filter((img) => img !== highlightImage)];
  }, [images, highlightImage]);

  const current = safeImages[Math.min(active, safeImages.length - 1)];

  return (
    <div className="space-y-3">
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-white/[0.05] to-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={`Zoom image: ${name}`}
          >
            {!failed[active] ? (
              <Image
                key={current}
                src={current}
                alt={`${name} — image ${active + 1} of ${safeImages.length}`}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                onError={() => setFailed((f) => ({ ...f, [active]: true }))}
              />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageOff className="size-8" aria-hidden="true" />
                <span className="text-meta uppercase tracking-[0.16em]">Image unavailable</span>
              </span>
            )}
            <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-black/55 px-3.5 py-2 text-[0.72rem] font-medium text-white/90 backdrop-blur-md transition-colors group-hover:bg-black/70" aria-hidden="true">
              <ZoomIn className="size-3.5" />
              Zoom
            </span>
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md" />
          <Dialog.Content className="fixed inset-0 z-[90] flex items-center justify-center p-4 focus:outline-none" aria-label={`${name} — zoomed image`}>
            <Dialog.Title className="sr-only">{`${name} — zoomed image`}</Dialog.Title>
            <div className="relative aspect-square w-full max-w-2xl overflow-hidden rounded-3xl border border-line-strong bg-elevated">
              {!failed[active] ? (
                <Image key={`zoom-${current}`} src={current} alt={`${name} — zoomed view`} fill sizes="(max-width: 768px) 100vw, 672px" className="object-cover" onError={() => setFailed((f) => ({ ...f, [active]: true }))} />
              ) : (
                <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ImageOff className="size-8" aria-hidden="true" />
                </span>
              )}
            </div>
            <Dialog.Close
              aria-label="Close zoom"
              className="absolute right-5 top-5 inline-flex size-11 items-center justify-center rounded-full border border-line-strong bg-black/60 text-foreground backdrop-blur-md transition-colors hover:bg-black/80"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {safeImages.length > 1 && (
        <div className="flex gap-3">
          {safeImages.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              aria-pressed={i === active}
              aria-label={`View image ${i + 1} of ${safeImages.length}`}
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                i === active ? "border-violet-glow/70 ring-2 ring-violet-glow/30" : "border-line opacity-70 hover:opacity-100"
              )}
            >
              {!failed[i] ? (
                <Image src={img} alt="" fill sizes="80px" className="object-cover" onError={() => setFailed((f) => ({ ...f, [i]: true }))} />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-elevated">
                  <ImageOff className="size-4 text-muted-foreground" aria-hidden="true" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
