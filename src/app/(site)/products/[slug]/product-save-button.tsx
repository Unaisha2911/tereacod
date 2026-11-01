"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { savedItemsService, useSavedItems } from "@/services/saved-items";
import { cn } from "@/lib/utils";

/**
 * ProductSaveButton — saved-item control for the product detail page.
 * Subscribes to the shared in-memory saved-items store so it stays in
 * sync with every ItemCard rendering the same item (and vice versa).
 */
export function ProductSaveButton({ itemId, name }: { itemId: string; name: string }) {
  const saved = useSavedItems((s) => s.items.some((i) => i.itemId === itemId));

  const onToggle = () => {
    savedItemsService.toggle(itemId);
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved items` : `Save ${name} for later`}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-medium transition-colors",
        saved
          ? "border-violet-glow/50 bg-violet-glow/15 text-violet-soft"
          : "border-line-strong text-foreground hover:border-violet-glow/40 hover:bg-foreground/[0.04]"
      )}
    >
      {saved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
      {saved ? "Saved" : "Save for later"}
    </button>
  );
}
