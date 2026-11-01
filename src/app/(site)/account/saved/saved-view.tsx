"use client";

import { useEffect, useMemo, useState } from "react";
import { BookmarkX, X } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { ItemCard } from "@/components/shared/item-card";
import { useToast } from "@/hooks/use-toast";
import { catalogService } from "@/services/catalog";
import { ensureCatalog, isCatalogReady } from "@/lib/client-catalog";
import { savedItemsService, useSavedItems } from "@/services/saved-items";
import type { CatalogItem } from "@/types";

/**
 * SavedView — same grid pattern as the public /saved page, wrapped in
 * the account chrome. Saved ids resolve through the catalog service
 * and each card offers an explicit remove control.
 */
export function SavedView() {
  const { toast } = useToast();
  const saved = useSavedItems((s) => s.items);

  const ids = useMemo(() => saved.map((entry) => entry.itemId), [saved]);
  const idSet = useMemo(() => new Set(ids), [ids]);
  // null = first resolution still in flight (service latency).
  const [resolved, setResolved] = useState<CatalogItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Resolution reads the client catalog mirror — it only preloads when a
    // cart has lines, so make sure it is ready before mapping ids. (For a
    // signed-in member this is one cached API round trip at most.)
    void (async () => {
      if (!isCatalogReady()) {
        await ensureCatalog().catch(() => undefined);
      }
      return catalogService.itemsByIds(ids);
    })()
      .then((items) => {
        if (!cancelled) setResolved(items);
      })
      .catch(() => {
        if (!cancelled) setResolved([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  // Filter against the *current* ids so removals leave the grid at once.
  const visible = useMemo(
    () => (resolved ?? []).filter((item) => idSet.has(item.id)),
    [resolved, idSet]
  );

  const onRemove = (itemId: string, name: string) => {
    savedItemsService.remove(itemId);
    toast({
      title: "Removed from saved items",
      description: `${name} was removed from your saved items.`,
    });
  };

  if (resolved === null) {
    // First resolution in flight — honest loading feedback inside the
    // account chrome (no blank frame, no premature empty state).
    return <LoadingIndicator label="Loading saved items" className="py-16" />;
  }

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={BookmarkX}
        title="No saved items yet"
        body="Browse the shop and bookmark products to find them here — your list is saved to your account."
        actionLabel="Browse the shop"
        actionHref="/discover"
      />
    );
  }

  return (
    <div>
      <p className="mb-4 text-[0.8rem] text-muted-foreground" role="note">
        {visible.length} {visible.length === 1 ? "item" : "items"} saved to your account — synced across your
        signed-in devices.
      </p>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
        {visible.map((item) => (
          <li key={item.id} className="flex flex-col gap-2">
            <ItemCard item={item} />
            <button
              type="button"
              onClick={() => onRemove(item.id, item.name)}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line text-[0.82rem] font-medium text-muted-foreground transition-colors hover:border-error/50 hover:text-error"
              aria-label={`Remove ${item.name} from saved items`}
            >
              <X className="size-3.5" aria-hidden="true" />
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
