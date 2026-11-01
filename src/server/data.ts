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
  listAllPublishedProducts,
  listProducts,
  getProduct,
  getBrand as getBrandBySlug,
  getCategory as getCategoryBySlug,
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

export async function getProducts(): Promise<CatalogItem[]> {
  // Single products query + one hydration fan-out (cached 10s at the repo).
  // Replaces the former page-by-page drain through listProducts — that was
  // 7 D1 round trips per 48-row page, executed serially on every request.
  return listAllPublishedProducts();
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

/** Catalog items for a brand landing page (featured-first, full page). */
export async function getBrandItems(slug: string): Promise<CatalogItem[]> {
  const page = await listProducts({ brandSlug: slug, pageSize: 48, page: 1 });
  return page.items;
}

