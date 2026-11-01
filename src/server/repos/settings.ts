/**
 * TereaCOD — settings & navigation repository.
 *
 * Site settings, delivery config and feature flags are KV-shaped documents
 * (kvGet/kvSet — Workers KV binding locally emulated by kv_store) with a
 * revision history in D1 for audit. Navigation is a normal table.
 */

import { getDb } from "@/server/db/client";
import { kvGet, kvSet } from "@/server/kv";
import { newId } from "@/server/ids";
import { cached, invalidateCache, CACHE_TTL } from "@/server/cache";
import type { NavigationItem, SiteSettings } from "@/types";

export const DEFAULT_DELIVERY_CONFIG = {
  freeThresholdFils: 20_000, // AED 200
  standardFeeFils: 2_500, // AED 25
  expressFeeFils: 3_500, // AED 35
};

export interface DeliveryConfig {
  freeThresholdFils: number;
  standardFeeFils: number;
  expressFeeFils: number;
}

export interface FeatureFlags {
  maintenance: boolean;
  checkoutEnabled: boolean;
}

/* ------------------------------- site settings ---------------------------- */

export async function getSiteSettings(): Promise<SiteSettings | null> {
  // KV/D1 read per request on Workers — memoized briefly so warm isolates
  // skip the round trip. Invalidated by updateSiteSettings below.
  return cached("settings:site", CACHE_TTL.settings, () => kvGet<SiteSettings>("settings:site"));
}

export async function updateSiteSettings(
  patch: Partial<SiteSettings>,
  actor: { id?: string; label: string } = { label: "system" }
): Promise<SiteSettings> {
  // Read-through KV (NOT the cached getter): merging into a fresh value
  // avoids resurrecting state another isolate changed inside the TTL window.
  const current = (await kvGet<SiteSettings>("settings:site")) ?? ({} as SiteSettings);
  const next: SiteSettings = { ...current, ...patch };
  await kvSet("settings:site", next);
  invalidateCache("settings:");

  // Revision history (audit) in D1.
  const db = await getDb();
  const latest = await db.get<{ revision: number }>(
    `SELECT MAX(revision) AS revision FROM settings_revisions WHERE key = 'site'`
  );
  await db.run(
    `INSERT INTO settings_revisions (id, key, revision, value_json, updated_by, updated_at)
     VALUES (?, 'site', ?, ?, ?, ?)`,
    [
      newId("set"),
      (latest?.revision ?? 0) + 1,
      JSON.stringify(next),
      actor.id ?? actor.label,
      new Date().toISOString(),
    ]
  );
  return next;
}

/* ----------------------------- delivery & flags --------------------------- */

export async function getDeliveryConfig(): Promise<DeliveryConfig> {
  return cached("settings:delivery", CACHE_TTL.delivery, async () =>
    (await kvGet<DeliveryConfig>("settings:delivery")) ?? DEFAULT_DELIVERY_CONFIG
  );
}

export async function saveDeliveryConfig(
  config: DeliveryConfig,
  actor: { id?: string; label: string } = { label: "system" }
): Promise<void> {
  await kvSet("settings:delivery", config);
  invalidateCache("settings:");
  const db = await getDb();
  const latest = await db.get<{ revision: number }>(
    `SELECT MAX(revision) AS revision FROM settings_revisions WHERE key = 'delivery'`
  );
  await db.run(
    `INSERT INTO settings_revisions (id, key, revision, value_json, updated_by, updated_at)
     VALUES (?, 'delivery', ?, ?, ?, ?)`,
    [
      newId("set"),
      (latest?.revision ?? 0) + 1,
      JSON.stringify(config),
      actor.id ?? actor.label,
      new Date().toISOString(),
    ]
  );
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  return cached("settings:features", CACHE_TTL.flags, async () =>
    (await kvGet<FeatureFlags>("settings:features")) ?? { maintenance: false, checkoutEnabled: true }
  );
}

export async function saveFeatureFlags(
  flags: FeatureFlags,
  actor: { id?: string; label: string } = { label: "system" }
): Promise<void> {
  await kvSet("settings:features", flags);
  invalidateCache("settings:");
}

/* -------------------------------- navigation ------------------------------ */

function mapNav(row: Record<string, unknown>): NavigationItem {
  return {
    id: row.id as string,
    label: row.label as string,
    href: row.href as string,
    description: (row.description as string) ?? undefined,
    icon: (row.icon as string) ?? undefined,
    badge: (row.badge as string) ?? undefined,
    sortOrder: row.sort_order as number,
    enabled: row.enabled === 1,
    location: row.location as NavigationItem["location"],
  };
}

/**
 * ONE query for every navigation location, split in JS. The AppShell needs
 * header + mobile + legal + 3 footer columns per request — six separate
 * round trips before; now a single cached read (keyed per location so
 * callers stay independent).
 */
async function navAll(): Promise<Map<string, NavigationItem[]>> {
  return cached("settings:nav-all", CACHE_TTL.nav, async () => {
    const db = await getDb();
    const rows = await db.all<Record<string, unknown>>(
      `SELECT * FROM navigation_items WHERE enabled = 1 ORDER BY sort_order`
    );
    const byLocation = new Map<string, NavigationItem[]>();
    for (const row of rows) {
      const location = row.location as string;
      const list = byLocation.get(location) ?? [];
      list.push(mapNav(row));
      byLocation.set(location, list);
    }
    return byLocation;
  });
}

async function navFor(location: NavigationItem["location"]): Promise<NavigationItem[]> {
  const all = await navAll();
  return all.get(location) ?? [];
}

export function headerNav(): Promise<NavigationItem[]> {
  return navFor("header");
}
export function mobileNav(): Promise<NavigationItem[]> {
  return navFor("mobile");
}
export function legalNav(): Promise<NavigationItem[]> {
  return navFor("legal");
}
export async function footerColumns(): Promise<NavigationItem[][]> {
  const locations = ["footer-column-1", "footer-column-2", "footer-column-3"] as const;
  const all = await navAll();
  return locations.map((loc) => all.get(loc) ?? []);
}
