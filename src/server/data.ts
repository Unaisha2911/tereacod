/**
 * TereaCOD — server data facade.
 *
 * The single server-side entry point that server components use instead of
 * the former static imports (src/data/*). Every helper is async and reads
 * through the repositories (D1 on Workers, local SQLite in dev). Client
 * components never import this module — they use /api/v1 via src/services.
 */

import type {
  Brand,
  CatalogCategory,
  CatalogItem,
  ComplianceRecord,
  LegalDocument,
  NavigationItem,
  SiteSettings,
} from "@/types";
import {
  listBrands,
  listCategories,
  listProducts,
  getProduct,
  getBrand as getBrandBySlug,
  getCategory as getCategoryBySlug,
  brandItemCounts,
  publishedProductCount,
  originFacetCounts,
} from "@/server/repos/catalog";
import {
  getSiteSettings,
  headerNav as headerNavRepo,
  mobileNav as mobileNavRepo,
  footerColumns as footerColumnsRepo,
  legalNav as legalNavRepo,
} from "@/server/repos/settings";
import {
  listLegalDocuments,
  getLegalDocument,
  listComplianceRecords,
  listFaqs,
} from "@/server/repos/content";
import { listMedia } from "@/server/repos/media";
import { SITE_SETTINGS_FALLBACK } from "@/server/api/bootstrap";

export async function getSettings(): Promise<SiteSettings> {
  return (await getSiteSettings()) ?? SITE_SETTINGS_FALLBACK;
}

export function headerNav(): Promise<NavigationItem[]> {
  return headerNavRepo();
}
export function mobileNav(): Promise<NavigationItem[]> {
  return mobileNavRepo();
}
export function footerColumns(): Promise<NavigationItem[][]> {
  return footerColumnsRepo();
}
export function legalNav(): Promise<NavigationItem[]> {
  return legalNavRepo();
}

export function getLegalDocuments(): Promise<LegalDocument[]> {
  return listLegalDocuments();
}
export function getLegalDocumentBySlug(slug: string): Promise<LegalDocument | null> {
  return getLegalDocument(slug);
}
export function getComplianceRecords(): Promise<ComplianceRecord[]> {
  return listComplianceRecords();
}

export function getFaqs(): Promise<Array<{ id: string; category: string; question: string; answer: string }>> {
  return listFaqs();
}

export async function getCategories(): Promise<CatalogCategory[]> {
  return listCategories();
}
export function getCategoryBySlugRepo(slug: string): Promise<CatalogCategory | null> {
  return getCategoryBySlug(slug);
}

export function getProductBySlug(slug: string): Promise<CatalogItem | null> {
  return getProduct(slug);
}

export async function getBrands(): Promise<Brand[]> {
  return listBrands();
}
export function getBrandBySlugRepo(slug: string): Promise<Brand | null> {
  return getBrandBySlug(slug);
}

/** Published product count per brand slug — one cached COUNT query. */
export function getBrandItemCounts(): Promise<Record<string, number>> {
  return brandItemCounts();
}

/** Published catalog size — one cached COUNT (never hydrate the catalog for a count). */
export function getPublishedProductCount(): Promise<number> {
  return publishedProductCount();
}

/** Collections/brands holding products on one origin line — cached GROUP BY counts. */
export function getOriginFacetCounts(originLine: string) {
  return originFacetCounts(originLine);
}

