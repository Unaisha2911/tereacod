/**
 * TereaCOD — client catalog mirror.
 *
 * A lightweight, read-only mirror of the catalog used by client-side
 * estimators (cart line resolution, saved-item resolution). The SERVER
 * remains the source of truth: cart/order pricing and availability are
 * re-verified server-side at quote and order creation. The mirror only
 * keeps the UI instant.
 */

import { useSyncExternalStore } from "react";
import type { CatalogItem } from "@/types";

let items: CatalogItem[] = [];
let loadPromise: Promise<void> | null = null;

/**
 * Mirror readiness — separate from "has items" so an EMPTY published
 * catalog still counts as ready (a load that resolved zero products is
 * done, not pending). Cart/checkout views gate line-detail rendering on
 * this via useCatalogReady(); quick-add awaits it before resolving a
 * default variant.
 */
let ready = false;
const readyListeners = new Set<() => void>();

export function isCatalogReady(): boolean {
  return ready;
}

function subscribeReady(onChange: () => void): () => void {
  readyListeners.add(onChange);
  return () => {
    readyListeners.delete(onChange);
  };
}

/** Reactive readiness for client views (SSR snapshot: ready). */
export function useCatalogReady(): boolean {
  return useSyncExternalStore(subscribeReady, isCatalogReady, () => true);
}

async function loadPage(page: number): Promise<{ items: CatalogItem[]; hasMore: boolean; total?: number }> {
  const response = await fetch(`/api/v1/catalog/products?page=${page}&pageSize=48`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Catalog mirror load failed (${response.status})`);
  const body = (await response.json()) as {
    data: { items: CatalogItem[]; hasMore: boolean };
    meta?: { pagination?: { total?: number } };
  };
  return {
    items: body.data.items,
    hasMore: body.data.hasMore,
    total: body.meta?.pagination?.total,
  };
}

/**
 * Load (once) the full published catalog into the mirror.
 *
 * Page 1 resolves the total first; every REMAINING page is then fetched
 * concurrently (bounded by the server's pagination) instead of the old
 * serial page-by-page waterfall — with N pages the wait drops from
 * N × latency to roughly 2 × latency.
 */
export async function ensureCatalog(): Promise<void> {
  if (items.length > 0) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      const first = await loadPage(1);
      const collected = [...first.items];
      if (first.hasMore) {
        // Derive the page count from the reported total (pageSize 48),
        // clamped to the historical 10-page safety bound.
        const totalPages = Math.min(10, Math.ceil((first.total ?? collected.length) / 48) || 1);
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) => loadPage(i + 2).catch(() => ({ items: [], hasMore: false })))
        );
        for (const page of rest) collected.push(...page.items);
      }
      items = collected;
      ready = true;
      for (const listener of readyListeners) listener();
    })().catch((error) => {
      loadPromise = null;
      throw error;
    });
  }
  await loadPromise;
}

export function isCatalogLoaded(): boolean {
  return items.length > 0;
}

function markReady(): void {
  if (!ready) {
    ready = true;
    for (const listener of readyListeners) listener();
  }
}

/**
 * Fetch ONLY the products a view actually needs (cart lines, saved items,
 * quick-add target) into the mirror — instead of downloading the whole
 * catalog. Merges into the existing mirror and marks it ready; a hit in
 * the mirror never triggers a request.
 */
export async function ensureCatalogSubset(filter: { ids?: string[]; slugs?: string[] }): Promise<void> {
  const wantIds = (filter.ids ?? []).filter((id) => !items.some((i) => i.id === id));
  const wantSlugs = (filter.slugs ?? []).filter((s) => !items.some((i) => i.slug === s));
  if (wantIds.length === 0 && wantSlugs.length === 0) {
    markReady();
    return;
  }
  const params = new URLSearchParams();
  // Repo-side chunking caps bound parameters at 90 — stay under it.
  if (wantIds.length > 0) params.set("ids", wantIds.slice(0, 90).join(","));
  if (wantSlugs.length > 0) params.set("slugs", wantSlugs.slice(0, 90).join(","));
  const response = await fetch(`/api/v1/catalog/products?${params.toString()}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Catalog subset load failed (${response.status})`);
  const body = (await response.json()) as { data: CatalogItem[] };
  const fetched = Array.isArray(body.data) ? body.data : [];
  const known = new Set(items.map((i) => i.id));
  items = [...items, ...fetched.filter((i) => !known.has(i.id))];
  markReady();
}

/** Full mirror snapshot — for client-side listing views (discover grid). */
export function allCatalogItems(): CatalogItem[] {
  return items;
}

export function findInCatalog(slug: string): CatalogItem | null {
  return items.find((item) => item.slug === slug) ?? null;
}

export function findByIdInCatalog(id: string): CatalogItem | null {
  return items.find((item) => item.id === id) ?? null;
}

/** Refresh the mirror after admin catalog edits (best-effort). */
export function refreshCatalog(): void {
  items = [];
  ready = false;
  loadPromise = null;
  void ensureCatalog().catch(() => undefined);
}
