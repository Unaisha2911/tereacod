"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, X } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { PageContainer } from "@/components/layout/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { ItemCard } from "@/components/shared/item-card";
import { savedItemsService, useSavedItems } from "@/services/saved-items";
import { catalogService } from "@/services/catalog";
import { ensureCatalog, isCatalogReady } from "@/lib/client-catalog";
import { useToast } from "@/hooks/use-toast";
import type { CatalogItem } from "@/types";

export function SavedView() {
  const savedItems = useSavedItems((s) => s.items);
  const { toast } = useToast();
  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [resolved, setResolved] = useState<CatalogItem[] | null>(null);

  const ids = useMemo(() => savedItems.map((saved) => saved.itemId), [savedItems]);
  const idSet = useMemo(() => new Set(ids), [ids]);

  // Brief load via the service facade so the state machine is honest.
  useEffect(() => {
    let cancelled = false;
    savedItemsService.list().then(() => {
      if (!cancelled) setPhase("ready");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Saved ids resolve through the catalog service (order preserved);
  // removals re-filter instantly via idSet below. The mirror only
  // preloads when a cart has lines — guarantee it is ready first.
  useEffect(() => {
    let cancelled = false;
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

  const visible = (resolved ?? []).filter((item) => idSet.has(item.id));

  const onRemove = (item: CatalogItem) => {
    savedItemsService.remove(item.id);
    toast({
      title: "Removed from saved",
      description: `${item.name} was removed from your saved items.`,
    });
  };

  return (
    <PageContainer>
      <PageHeading
        eyebrow="Catalog"
        title="Saved items"
        lead="Products you've bookmarked — sign in and they sync across all your devices."
      />

      <PrototypeNotice className="mb-10">
        Saved items sync to your account when you're signed in. Guests keep the list on this device only.
      </PrototypeNotice>

      {phase === "loading" || resolved === null ? (
        <LoadingIndicator label="Loading saved items" className="py-16" />
      ) : visible.length === 0 ? (
        <div className="space-y-5 pb-10">
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            body="Products you save with the bookmark control appear here. Sign in and your list syncs to your account across devices."
            actionLabel="Discover TereaCOD"
            actionHref="/discover"
          />
          <p className="text-center text-[0.82rem] text-muted-foreground">
            <Link
              href="/account/sign-in"
              className="underline decoration-line-strong underline-offset-4 transition-colors hover:text-foreground"
            >
              Sign in to sync across devices
            </Link>
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
          {visible.map((item) => (
            <li key={item.id} className="flex flex-col gap-2">
              <ItemCard item={item} />
              <button
                type="button"
                onClick={() => onRemove(item)}
                aria-label={`Remove ${item.name} from saved items`}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line text-[0.78rem] font-medium text-muted-foreground transition-colors hover:border-error/40 hover:text-error"
              >
                <X className="size-3.5" aria-hidden="true" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
