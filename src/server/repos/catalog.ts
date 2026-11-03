/**
 * TereaCOD — catalog repository (products, categories, brands, search).
 *
 * Maps D1 rows onto the exact UI contracts in src/types (CatalogItem,
 * CatalogCategory, Brand, Paginated). All list endpoints hydrate child
 * collections (images/variants/specs/faqs/related) in bounded IN queries —
 * no N+1 per item.
 */

import { getDb } from "@/server/db/client";
import { cached, invalidateCache, CACHE_TTL } from "@/server/cache";
import type {
  AdminProductDetail,
  AdminProductImage,
  AdminProductListResult,
  AdminProductPatch,
  AdminProductSpecGroup,
  AdminProductSummary,
  AdminProductVariant,
  Availability,
  Brand,
  CatalogCategory,
  CatalogItem,
  ConformityInfo,
  DocumentRef,
  ItemVariant,
  Paginated,
  SpecificationGroup,
} from "@/types";
import type { SortKey } from "@/lib/catalog-sort";
import { filsToAED } from "@/server/money";
import { newId } from "@/server/ids";

/* ------------------------------ row mappers ------------------------------ */

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  brand_id: string;
  category_id: string;
  sku: string;
  model: string | null;
  tagline: string;
  description: string;
  price_cents: number;
  compare_at_cents: number | null;
  editorial_availability: string | null;
  low_stock_threshold: number;
  is_featured: number;
  is_new: number;
  nicotine_strength: string | null;
  age_restricted: number;
  origin: string | null;
  compatibility_json: string | null;
  conformity_json: string | null;
  warnings_json: string | null;
  published_at: string | null;
  brand_name: string;
  category_slug: string;
  available_qty: number | null;
  variant_unavailable: number | null;
}

function deriveAvailability(row: ProductRow): Availability {
  if (row.editorial_availability === "unavailable") return "unavailable";
  const qty = row.available_qty ?? 0;
  if (qty <= 0) return "out_of_stock";
  if (qty <= row.low_stock_threshold) return "low_stock";
  return "in_stock";
}

function parseJsonArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/* --------------------------- child hydration ----------------------------- */

async function hydrate(rows: ProductRow[]): Promise<CatalogItem[]> {
  if (rows.length === 0) return [];
  const db = await getDb();
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");

  const [imageRows, variantRows, groupRows, faqRows, relatedRows] = await Promise.all([
    db.all<{ product_id: string; url: string; alt: string | null }>(
      `SELECT pi.product_id, m.url, pi.alt
       FROM product_images pi JOIN media_assets m ON m.id = pi.media_asset_id
       WHERE pi.product_id IN (${placeholders})
       ORDER BY pi.product_id, pi.position`,
      ids
    ),
    db.all<{
      id: string;
      product_id: string;
      label: string;
      type: string;
      swatch: string | null;
      meta: string | null;
      available: number;
      price_delta_cents: number;
      image_url: string | null;
    }>(
      `SELECT pv.id, pv.product_id, pv.label, pv.type, pv.swatch, pv.meta,
              pv.available, pv.price_delta_cents, m.url AS image_url
       FROM product_variants pv
       LEFT JOIN media_assets m ON m.id = pv.image_media_id
       WHERE pv.product_id IN (${placeholders}) ORDER BY pv.product_id, pv.position`,
      ids
    ),
    db.all<{ id: string; product_id: string; title: string; label: string; value: string }>(
      `SELECT g.id, g.product_id, g.title, e.label, e.value
       FROM product_spec_groups g
       JOIN product_spec_entries e ON e.group_id = g.id
       WHERE g.product_id IN (${placeholders})
       ORDER BY g.product_id, g.position, e.position`,
      ids
    ),
    db.all<{ product_id: string; question: string; answer: string }>(
      `SELECT product_id, question, answer FROM product_faqs
       WHERE product_id IN (${placeholders}) ORDER BY product_id, position`,
      ids
    ),
    db.all<{ product_id: string; slug: string }>(
      `SELECT r.product_id, p.slug FROM product_related r
       JOIN products p ON p.id = r.related_product_id
       WHERE r.product_id IN (${placeholders}) ORDER BY r.product_id, r.position`,
      ids
    ),
  ]);

  const imagesBy = new Map<string, string[]>();
  for (const img of imageRows) {
    const list = imagesBy.get(img.product_id) ?? [];
    list.push(img.url);
    imagesBy.set(img.product_id, list);
  }

  const variantsBy = new Map<string, ItemVariant[]>();
  for (const v of variantRows) {
    const list = variantsBy.get(v.product_id) ?? [];
    list.push({
      id: v.id,
      label: v.label,
      type: v.type as ItemVariant["type"],
      swatch: v.swatch ?? undefined,
      available: v.available === 1,
      meta: v.meta ?? undefined,
      ...(v.price_delta_cents !== 0 ? { priceDelta: filsToAED(v.price_delta_cents) } : {}),
      ...(v.image_url ? { imageUrl: v.image_url } : {}),
    });
    variantsBy.set(v.product_id, list);
  }

  const specsBy = new Map<string, SpecificationGroup[]>();
  const groupsByProduct = new Map<string, Map<string, SpecificationGroup>>();
  for (const g of groupRows) {
    let groups = groupsByProduct.get(g.product_id);
    if (!groups) {
      groups = new Map();
      groupsByProduct.set(g.product_id, groups);
    }
    let group = groups.get(g.id);
    if (!group) {
      group = { title: g.title, entries: [] };
      groups.set(g.id, group);
    }
    group.entries.push({ label: g.label, value: g.value });
  }
  for (const [productId, groups] of groupsByProduct) {
    specsBy.set(productId, [...groups.values()]);
  }

  const faqsBy = new Map<string, Array<{ question: string; answer: string }>>();
  for (const f of faqRows) {
    const list = faqsBy.get(f.product_id) ?? [];
    list.push({ question: f.question, answer: f.answer });
    faqsBy.set(f.product_id, list);
  }

  const relatedBy = new Map<string, string[]>();
  for (const r of relatedRows) {
    const list = relatedBy.get(r.product_id) ?? [];
    list.push(r.slug);
    relatedBy.set(r.product_id, list);
  }

  return rows.map((row) => {
    const item: CatalogItem = {
      id: row.id,
      slug: row.slug,
      name: row.name,
      brand: row.brand_name,
      categorySlug: row.category_slug,
      sku: row.sku,
      model: row.model ?? undefined,
      tagline: row.tagline,
      description: row.description,
      price: filsToAED(row.price_cents),
      compareAtPrice: row.compare_at_cents === null ? undefined : filsToAED(row.compare_at_cents),
      images: imagesBy.get(row.id) ?? [],
      specs: specsBy.get(row.id) ?? [],
      variants: variantsBy.get(row.id) ?? [],
      compatibility: parseJsonArray<string>(row.compatibility_json).length
        ? parseJsonArray<string>(row.compatibility_json)
        : undefined,
      origin: row.origin ?? undefined,
      conformity: parseJsonArray<ConformityInfo>(row.conformity_json),
      warnings: parseJsonArray<string>(row.warnings_json),
      documents: [] as DocumentRef[],
      availability: deriveAvailability(row),
      featured: row.is_featured === 1,
      isNew: row.is_new === 1,
      nicotineStrength: row.nicotine_strength ?? undefined,
      ageRestricted: row.age_restricted === 1,
      faqs: faqsBy.get(row.id),
      relatedSlugs: relatedBy.get(row.id),
    };
    return item;
  });
}

/* ------------------------------- categories ------------------------------ */

export async function listCategories(): Promise<CatalogCategory[]> {
  // One row per category + a COUNT subquery — served from the isolate cache
  // across requests; invalidated by the admin category/brand/product writes.
  return cached("catalog:categories", CACHE_TTL.taxonomy, async () => {
  const db = await getDb();
  const rows = await db.all<{
    id: string;
    slug: string;
    name: string;
    description: string;
    long_description: string | null;
    image_url: string | null;
    accent: string;
    featured: number;
    item_count: number;
  }>(
    `SELECT c.*, m.url AS image_url,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS item_count
     FROM categories c LEFT JOIN media_assets m ON m.id = c.image_media_id
     ORDER BY c.position, c.name`
  );
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    longDescription: row.long_description ?? undefined,
    image: row.image_url ?? undefined,
    itemCount: row.item_count,
    featured: row.featured === 1,
    accent: row.accent as CatalogCategory["accent"],
  }));
  });
}

export async function getCategory(slug: string): Promise<CatalogCategory | null> {
  const categories = await listCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

/* --------------------------------- brands -------------------------------- */

export async function listBrands(): Promise<Brand[]> {
  return cached("catalog:brands", CACHE_TTL.taxonomy, async () => {
  const db = await getDb();
  const rows = await db.all<{
    id: string;
    slug: string;
    name: string;
    tagline: string;
    blurb: string;
    description: string;
    origin: string | null;
    established: string | null;
    accent: string;
    featured: number;
  }>(`SELECT * FROM brands ORDER BY position, name`);
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    blurb: row.blurb,
    description: row.description,
    origin: row.origin ?? "",
    established: row.established ?? "",
    accent: row.accent as Brand["accent"],
    featured: row.featured === 1,
  }));
  });
}

export async function getBrand(slug: string): Promise<Brand | null> {
  const brands = await listBrands();
  return brands.find((b) => b.slug === slug) ?? null;
}

export async function brandItemCounts(): Promise<Record<string, number>> {
  return cached("catalog:brand-counts", CACHE_TTL.taxonomy, async () => {
  const db = await getDb();
  const rows = await db.all<{ slug: string; count: number }>(
    `SELECT b.slug, COUNT(p.id) AS count FROM brands b
     LEFT JOIN products p ON p.brand_id = b.id
     GROUP BY b.id ORDER BY b.position`
  );
  return Object.fromEntries(rows.map((r) => [r.slug, r.count]));
  });
}

/* -------------------------------- products ------------------------------- */

const SELECT_PRODUCT = `
  SELECT p.*, b.name AS brand_name, c.slug AS category_slug,
         (
           SELECT COALESCE(SUM(iv.qty_on_hand - iv.qty_reserved), 0)
           FROM inventory iv WHERE iv.product_id = p.id
         ) AS available_qty,
         (SELECT COUNT(*) FROM product_variants pv
           WHERE pv.product_id = p.id AND pv.available = 0) AS variant_unavailable
  FROM products p
  JOIN brands b ON b.id = p.brand_id
  JOIN categories c ON c.id = p.category_id
`;

const SORT_SQL: Record<SortKey, string> = {
  featured: `p.is_featured DESC, p.published_at DESC, p.name ASC`,
  "price-asc": `p.price_cents ASC, p.name ASC`,
  "price-desc": `p.price_cents DESC, p.name ASC`,
  newest: `p.published_at DESC, p.name ASC`,
  "name-asc": `p.name COLLATE NOCASE ASC`,
  "name-desc": `p.name COLLATE NOCASE DESC`,
};

export interface CatalogQueryInput {
  categorySlug?: string;
  brandSlug?: string;
  query?: string;
  sort?: SortKey;
  availability?: CatalogItem["availability"] | "all";
  /** Exact product `origin` column value (see src/lib/catalog-origin.ts). */
  originLine?: string;
  page?: number;
  pageSize?: number;
}

export async function listProducts(query: CatalogQueryInput = {}): Promise<Paginated<CatalogItem>> {
  const db = await getDb();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, query.pageSize ?? 9));
  const sortKey: SortKey = query.sort && query.sort in SORT_SQL ? query.sort : "featured";

  // Cache key mirrors the full filter set — availability derives from live
  // inventory, hence the short list TTL.
  const cacheKey = [
    "catalog:list",
    query.categorySlug ?? "-",
    query.brandSlug ?? "-",
    query.originLine ?? "-",
    (query.query ?? "").trim().toLowerCase(),
    query.availability ?? "-",
    sortKey,
    page,
    pageSize,
  ].join("|");

  return cached(cacheKey, CACHE_TTL.catalogList, async () => {
  const where: string[] = [`p.published_at IS NOT NULL`];
  const params: unknown[] = [];

  if (query.categorySlug) {
    where.push(`c.slug = ?`);
    params.push(query.categorySlug);
  }
  if (query.brandSlug) {
    where.push(`b.slug = ?`);
    params.push(query.brandSlug);
  }
  if (query.originLine) {
    where.push(`p.origin = ?`);
    params.push(query.originLine);
  }
  if (query.availability && query.availability !== "all") {
    const STOCK = `(SELECT COALESCE(SUM(iv.qty_on_hand - iv.qty_reserved), 0)
                    FROM inventory iv WHERE iv.product_id = p.id)`;
    if (query.availability === "in_stock") {
      where.push(`p.editorial_availability IS NULL AND ${STOCK} > p.low_stock_threshold`);
    } else if (query.availability === "low_stock") {
      where.push(
        `p.editorial_availability IS NULL AND ${STOCK} > 0 AND ${STOCK} <= p.low_stock_threshold`
      );
    } else if (query.availability === "out_of_stock") {
      where.push(`p.editorial_availability IS NULL AND ${STOCK} <= 0`);
    } else if (query.availability === "unavailable") {
      where.push(`p.editorial_availability = 'unavailable'`);
    }
  }
  if (query.query && query.query.trim()) {
    // External-content FTS: resolve ids through the content table via rowid.
    where.push(
      `p.id IN (
         SELECT c.product_id FROM product_fts_idx f
         JOIN product_fts c ON c.rowid = f.rowid
         WHERE product_fts_idx MATCH ?
       )`
    );
    params.push(ftsQuery(query.query.trim()));
  }

  const whereSql = where.join(" AND ");

  const [totalRow] = await Promise.all([
    db.get<{ count: number }>(
      `SELECT COUNT(*) AS count FROM products p
       JOIN brands b ON b.id = p.brand_id
       JOIN categories c ON c.id = p.category_id
       WHERE ${whereSql}`,
      params
    ),
  ]);
  const total = totalRow?.count ?? 0;

  const rows = await db.all<ProductRow>(
    `${SELECT_PRODUCT} WHERE ${whereSql} ORDER BY ${SORT_SQL[sortKey]} LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  const items = await hydrate(rows);
  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
  });
}

export async function getProduct(slug: string): Promise<CatalogItem | null> {
  return cached(`catalog:product:${slug}`, CACHE_TTL.product, async () => {
    const db = await getDb();
    // Drafts (published_at IS NULL) are console-only — never resolve for the
    // public catalog, carts or checkout.
    const row = await db.get<ProductRow>(`${SELECT_PRODUCT} WHERE p.slug = ? AND p.published_at IS NOT NULL`, [slug]);
    if (!row) return null;
    const [item] = await hydrate([row]);
    return item ?? null;
  });
}

/**
 * The whole published catalog in ONE products query + ONE hydrate fan-out.
 * Replaces the old page-by-page drain (pageSize 48 loop = 7 round trips per
 * page, serial) for server components that need everything (homepage,
 * sitemap-adjacent views). Bounded at 500 items as a safety net.
 */
export async function listAllPublishedProducts(limit = 500): Promise<CatalogItem[]> {
  return cached(`catalog:all:${limit}`, CACHE_TTL.catalogList, async () => {
    const db = await getDb();
    const rows = await db.all<ProductRow>(
      `${SELECT_PRODUCT} WHERE p.published_at IS NOT NULL
       ORDER BY p.is_featured DESC, p.published_at DESC, p.name ASC
       LIMIT ?`,
      [limit]
    );
    return hydrate(rows);
  });
}

export async function getRelatedProducts(slug: string): Promise<CatalogItem[]> {
  const item = await getProduct(slug);
  if (!item?.relatedSlugs?.length) return [];
  return getProductsBySlugs(item.relatedSlugs);
}

export async function getProductsBySlugs(slugs: string[]): Promise<CatalogItem[]> {
  if (slugs.length === 0) return [];
  const db = await getDb();
  const unique = [...new Set(slugs)];
  // Chunked IN lists — D1 caps one statement at 100 bound parameters, and a
  // large cart can exceed that.
  const items: CatalogItem[] = [];
  for (let i = 0; i < unique.length; i += 90) {
    const chunk = unique.slice(i, i + 90);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = await db.all<ProductRow>(
      `${SELECT_PRODUCT} WHERE p.slug IN (${placeholders}) AND p.published_at IS NOT NULL`,
      chunk
    );
    items.push(...(await hydrate(rows)));
  }
  const order = new Map(slugs.map((s, i) => [s, i]));
  return items.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
}

export async function getProductsByIds(ids: string[]): Promise<CatalogItem[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const items: CatalogItem[] = [];
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90);
    const placeholders = chunk.map(() => "?").join(",");
    // Published-only: this path serves customer surfaces (saved items). A
    // draft product id must not render through it, and an id that has since
    // been unpublished drops out of the list instead of leaking.
    const rows = await db.all<ProductRow>(
      `${SELECT_PRODUCT} WHERE p.id IN (${placeholders}) AND p.published_at IS NOT NULL`,
      chunk
    );
    items.push(...(await hydrate(rows)));
  }
  const order = new Map(ids.map((s, i) => [s, i]));
  return items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/** Lightweight existence check for customer-surface inserts (saved items). */
export async function findPublishedProductRef(productId: string): Promise<{ id: string } | null> {
  const db = await getDb();
  return db.get<{ id: string }>(
    `SELECT p.id FROM products p WHERE p.id = ? AND p.published_at IS NOT NULL`,
    [productId]
  );
}

/** FTS query builder: quote each term so user input cannot inject FTS syntax. */
function ftsQuery(input: string): string {
  const terms = input
    .split(/\s+/)
    .map((t) => t.replace(/["'()*:^]/g, "").trim())
    .filter(Boolean)
    .slice(0, 6);
  if (terms.length === 0) return '""';
  return terms.map((t) => `"${t}"*`).join(" AND ");
}

export async function searchProducts(
  query: string,
  pageSize = 24
): Promise<Paginated<CatalogItem>> {
  return listProducts({ query, pageSize, page: 1, sort: "featured" });
}

export interface Suggestion {
  slug: string;
  name: string;
  brand: string;
  category: string;
}

export async function suggestProducts(partial: string, limit = 6): Promise<Suggestion[]> {
  const trimmed = partial.trim();
  if (!trimmed) return [];
  // One lightweight FTS query — the previous path ran the full paginated
  // pipeline (COUNT + page + 5 hydration queries = 7 round trips) to return
  // 6 names for the highest-QPS public endpoint.
  const db = await getDb();
  return db.all<Suggestion>(
    `SELECT p.slug, p.name, b.name AS brand, c.slug AS category
     FROM product_fts_idx f
     JOIN product_fts cfts ON cfts.rowid = f.rowid
     JOIN products p ON p.id = cfts.product_id
     JOIN brands b ON b.id = p.brand_id
     JOIN categories c ON c.id = p.category_id
     WHERE product_fts_idx MATCH ? AND p.published_at IS NOT NULL
     ORDER BY p.is_featured DESC, p.name ASC
     LIMIT ?`,
    [ftsQuery(trimmed), limit]
  );
}

export async function allProductSlugs(): Promise<Array<{ slug: string; updated_at: string }>> {
  return cached("catalog:slugs", CACHE_TTL.product, async () => {
    const db = await getDb();
    return db.all<{ slug: string; updated_at: string }>(
      `SELECT slug, updated_at FROM products WHERE published_at IS NOT NULL`
    );
  });
}

export async function catalogCounts(): Promise<{ products: number; brands: number; categories: number }> {
  const db = await getDb();
  const row = await db.get<{ products: number; brands: number; categories: number }>(
    `SELECT
       (SELECT COUNT(*) FROM products) AS products,
       (SELECT COUNT(*) FROM brands) AS brands,
       (SELECT COUNT(*) FROM categories) AS categories`
  );
  return {
    products: row?.products ?? 0,
    brands: row?.brands ?? 0,
    categories: row?.categories ?? 0,
  };
}

/* ========================================================================== */
/*                             ADMIN — catalog                                */
/*                                                                            */
/* Console-facing reads/writes. Money stays in fils end-to-end; the admin UI  */
/* converts at the boundary. Variants are UPDATE-ONLY (carts reference their  */
/* ids); images/specs/documents are replace-all.                              */
/* ========================================================================== */

/* ------------------------------ shared helpers ---------------------------- */

/** Slugify: lowercase, alnum runs → hyphens, trimmed, capped at 80 chars. */
function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "item";
}

/** First free `base`, `base-2`, `base-3`… slug in a table (optionally excluding one row). */
async function uniqueSlug(
  table: "products" | "brands" | "categories",
  base: string,
  excludeId?: string
): Promise<string> {
  const db = await getDb();
  let candidate = base;
  for (let i = 2; i < 500; i++) {
    const row = excludeId
      ? await db.get<{ one: number }>(`SELECT 1 AS one FROM ${table} WHERE slug = ? AND id != ?`, [candidate, excludeId])
      : await db.get<{ one: number }>(`SELECT 1 AS one FROM ${table} WHERE slug = ?`, [candidate]);
    if (!row) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Shared failure shape so routes map cleanly onto HTTP statuses. */
export type AdminFailure = { code: "not_found" | "conflict" | "validation"; message: string };
export type AdminResult<T> = { ok: true; data: T } | { ok: false; failure: AdminFailure };

function failure<T>(code: AdminFailure["code"], message: string): AdminResult<T> {
  return { ok: false, failure: { code, message } };
}

function isForeignKeyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /foreign key/i.test(message);
}

/* ------------------------------- list products ---------------------------- */

export interface AdminProductQuery {
  q?: string;
  categoryId?: string;
  brandId?: string;
  status?: "all" | "published" | "draft";
  page?: number;
  pageSize?: number;
}

interface AdminProductListRow {
  id: string;
  slug: string;
  name: string;
  sku: string;
  brand_id: string;
  brand_name: string | null;
  category_id: string;
  category_name: string | null;
  origin: string | null;
  price_cents: number;
  compare_at_cents: number | null;
  published_at: string | null;
  is_featured: number;
  is_new: number;
  editorial_availability: string | null;
  low_stock_threshold: number;
  qty_on_hand: number | null;
  version: number;
  updated_at: string;
}

const ADMIN_PRODUCT_SELECT = `
  SELECT p.id, p.slug, p.name, p.sku,
         p.brand_id, b.name AS brand_name,
         p.category_id, c.name AS category_name,
         p.origin,
         p.price_cents, p.compare_at_cents, p.published_at,
         p.is_featured, p.is_new, p.editorial_availability,
         p.low_stock_threshold, p.version, p.updated_at,
         COALESCE(inv.qty_on_hand, 0) AS qty_on_hand
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN inventory inv ON inv.product_id = p.id AND inv.variant_id = ''
`;

function availabilityFrom(row: { editorial_availability: string | null; low_stock_threshold: number; qty_on_hand: number | null }): Availability {
  if (row.editorial_availability === "unavailable") return "unavailable";
  const qty = row.qty_on_hand ?? 0;
  if (qty <= 0) return "out_of_stock";
  if (qty <= row.low_stock_threshold) return "low_stock";
  return "in_stock";
}

function toSummary(row: AdminProductListRow): AdminProductSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sku: row.sku,
    brandId: row.brand_id,
    brandName: row.brand_name ?? "",
    categoryId: row.category_id,
    categoryName: row.category_name ?? "",
    origin: row.origin ?? null,
    priceCents: row.price_cents,
    compareAtCents: row.compare_at_cents,
    published: row.published_at !== null,
    publishedAt: row.published_at,
    featured: row.is_featured === 1,
    isNew: row.is_new === 1,
    availability: availabilityFrom(row),
    qtyOnHand: row.qty_on_hand ?? 0,
    version: row.version,
    updatedAt: row.updated_at,
  };
}

/** Admin product list — includes drafts; search/filter/paginate server-side. */
export async function adminListProducts(query: AdminProductQuery = {}): Promise<AdminProductListResult> {
  const db = await getDb();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(96, Math.max(1, query.pageSize ?? 24));

  const where: string[] = [];
  const params: unknown[] = [];
  if (query.status === "published") where.push(`p.published_at IS NOT NULL`);
  else if (query.status === "draft") where.push(`p.published_at IS NULL`);
  if (query.categoryId) {
    where.push(`p.category_id = ?`);
    params.push(query.categoryId);
  }
  if (query.brandId) {
    where.push(`p.brand_id = ?`);
    params.push(query.brandId);
  }
  const q = query.q?.trim();
  if (q) {
    where.push(`(p.name LIKE ? OR p.sku LIKE ?)`);
    params.push(`%${q}%`, `%${q}%`);
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await db.get<{ count: number }>(
    `SELECT COUNT(*) AS count FROM products p ${whereSql}`,
    params
  );
  const total = totalRow?.count ?? 0;

  const rows = await db.all<AdminProductListRow>(
    `${ADMIN_PRODUCT_SELECT} ${whereSql} ORDER BY p.updated_at DESC, p.name COLLATE NOCASE ASC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return { items: rows.map(toSummary), total, page, pageSize };
}

/* ------------------------------- get product ------------------------------ */

/** Full admin detail by id or slug — children hydrated for the editor. */
export async function adminGetProduct(idOrSlug: string): Promise<AdminProductDetail | null> {
  const db = await getDb();
  const row = await db.get<AdminProductListRow & {
    model: string | null;
    tagline: string;
    description: string;
    nicotine_strength: string | null;
    origin: string | null;
    age_restricted: number;
    keywords: string | null;
    warnings_json: string | null;
    conformity_json: string | null;
  }>(
    `SELECT p.id, p.slug, p.name, p.sku,
            p.brand_id, b.name AS brand_name,
            p.category_id, c.name AS category_name,
            p.price_cents, p.compare_at_cents, p.published_at,
            p.is_featured, p.is_new, p.editorial_availability,
            p.low_stock_threshold, p.version, p.updated_at,
            COALESCE(inv.qty_on_hand, 0) AS qty_on_hand,
            p.model, p.tagline, p.description, p.nicotine_strength, p.origin,
            p.age_restricted, p.keywords, p.warnings_json, p.conformity_json
     FROM products p
     LEFT JOIN brands b ON b.id = p.brand_id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN inventory inv ON inv.product_id = p.id AND inv.variant_id = ''
     WHERE p.id = ? OR p.slug = ?`,
    [idOrSlug, idOrSlug]
  );
  if (!row) return null;

  const [imageRows, variantRows, groupRows, documentRows] = await Promise.all([
    db.all<{ id: string; media_asset_id: string; url: string; alt: string | null }>(
      `SELECT pi.id, pi.media_asset_id, m.url, pi.alt
       FROM product_images pi
       JOIN media_assets m ON m.id = pi.media_asset_id
       WHERE pi.product_id = ? ORDER BY pi.position`,
      [row.id]
    ),
    db.all<{ id: string; label: string; type: string; swatch: string | null; available: number; price_delta_cents: number; image_media_id: string | null; image_url: string | null }>(
      `SELECT pv.id, pv.label, pv.type, pv.swatch, pv.available, pv.price_delta_cents,
              pv.image_media_id, m.url AS image_url
       FROM product_variants pv
       LEFT JOIN media_assets m ON m.id = pv.image_media_id
       WHERE pv.product_id = ? ORDER BY pv.position`,
      [row.id]
    ),
    db.all<{ id: string; title: string; entry_id: string | null; label: string | null; value: string | null }>(
      `SELECT g.id, g.title, e.id AS entry_id, e.label, e.value
       FROM product_spec_groups g
       LEFT JOIN product_spec_entries e ON e.group_id = g.id
       WHERE g.product_id = ?
       ORDER BY g.position, e.position`,
      [row.id]
    ),
    db.all<{ id: string; title: string; type: string; href: string | null; note: string | null }>(
      `SELECT id, title, type, href, note FROM product_documents WHERE product_id = ? ORDER BY rowid`,
      [row.id]
    ),
  ]);

  const images: AdminProductImage[] = imageRows.map((img) => ({
    id: img.id,
    mediaAssetId: img.media_asset_id,
    url: img.url,
    alt: img.alt,
  }));

  const variants: AdminProductVariant[] = variantRows.map((v) => ({
    id: v.id,
    label: v.label,
    type: v.type as AdminProductVariant["type"],
    swatch: v.swatch,
    available: v.available === 1,
    priceDeltaCents: v.price_delta_cents,
    imageMediaId: v.image_media_id,
    imageUrl: v.image_url,
  }));

  const groupsBy = new Map<string, AdminProductSpecGroup>();
  for (const g of groupRows) {
    let group = groupsBy.get(g.id);
    if (!group) {
      group = { id: g.id, title: g.title, entries: [] };
      groupsBy.set(g.id, group);
    }
    if (g.entry_id && g.label !== null && g.value !== null) {
      group.entries.push({ id: g.entry_id, label: g.label, value: g.value });
    }
  }

  return {
    ...toSummary(row),
    model: row.model,
    tagline: row.tagline,
    description: row.description,
    nicotineStrength: row.nicotine_strength,
    origin: row.origin,
    ageRestricted: row.age_restricted === 1,
    keywords: row.keywords,
    lowStockThreshold: row.low_stock_threshold,
    warnings: parseJsonArray<string>(row.warnings_json),
    conformity: parseJsonArray<ConformityInfo>(row.conformity_json),
    images,
    variants,
    specGroups: [...groupsBy.values()],
    documents: documentRows.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type as "pdf" | "web",
      href: d.href,
      note: d.note,
    })),
  };
}

/* ------------------------------ create product ---------------------------- */

export interface AdminCreateProductInput {
  name: string;
  sku: string;
  categoryId: string;
  brandId: string;
  priceCents: number;
  slug?: string;
  tagline?: string;
  description?: string;
  /** Sourcing line — must match a catalog-origin dbValue (admin dropdown). */
  origin?: string;
}

/** Creates a DRAFT product (published_at NULL) + inventory + FTS rows atomically. */
export async function adminCreateProduct(input: AdminCreateProductInput): Promise<AdminResult<{ id: string; slug: string }>> {
  const db = await getDb();

  const brand = await db.get<{ id: string; name: string }>(`SELECT id, name FROM brands WHERE id = ?`, [input.brandId]);
  if (!brand) return failure("validation", "Choose a brand that exists.");
  const category = await db.get<{ id: string }>(`SELECT id FROM categories WHERE id = ?`, [input.categoryId]);
  if (!category) return failure("validation", "Choose a category that exists.");

  const skuTaken = await db.get<{ id: string }>(`SELECT id FROM products WHERE sku = ?`, [input.sku]);
  if (skuTaken) return failure("conflict", `SKU "${input.sku}" is already in use by another product.`);

  const slug = await uniqueSlug("products", slugify(input.slug || input.name));
  const id = newId("prd");
  const now = new Date().toISOString();
  const tagline = input.tagline?.trim() || `${input.name} — new listing`;
  const description = input.description?.trim() || "Full description coming soon.";

  await db.batch([
    {
      sql: `INSERT INTO products
              (id, slug, name, brand_id, category_id, sku, tagline, description,
               price_cents, origin, published_at, created_at, updated_at, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 1)`,
      params: [id, slug, input.name, input.brandId, input.categoryId, input.sku, tagline, description, input.priceCents, input.origin?.trim() || null, now, now],
    },
    {
      sql: `INSERT INTO inventory (product_id, variant_id, qty_on_hand, qty_reserved, updated_at)
            VALUES (?, '', 0, 0, ?)`,
      params: [id, now],
    },
    {
      sql: `INSERT INTO product_fts (product_id, name, brand, tagline, description, keywords)
            VALUES (?, ?, ?, ?, ?, '')`,
      params: [id, input.name, brand.name, tagline, description],
    },
  ]);

  invalidateCache("catalog:");
  return { ok: true, data: { id, slug } };
}

/* ------------------------------ update product ---------------------------- */

/**
 * Full editor patch (AdminProductPatch). Column writes for scalar fields,
 * replace-all for images/specs/documents, UPDATE-only for variants.
 * Optimistic concurrency via expectedVersion; FTS is reindexed in-batch.
 */
export async function adminUpdateProduct(id: string, patch: AdminProductPatch): Promise<AdminResult<{ version: number }>> {
  const db = await getDb();

  const row = await db.get<AdminProductListRow & {
    model: string | null;
    tagline: string;
    description: string;
    nicotine_strength: string | null;
    origin: string | null;
    keywords: string | null;
    brand_name: string | null;
  }>(
    `SELECT p.id, p.slug, p.name, p.sku,
            p.brand_id, b.name AS brand_name,
            p.category_id, c.name AS category_name,
            p.price_cents, p.compare_at_cents, p.published_at,
            p.is_featured, p.is_new, p.editorial_availability,
            p.low_stock_threshold, p.version, p.updated_at,
            COALESCE(inv.qty_on_hand, 0) AS qty_on_hand,
            p.model, p.tagline, p.description, p.nicotine_strength, p.origin, p.keywords
     FROM products p
     LEFT JOIN brands b ON b.id = p.brand_id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN inventory inv ON inv.product_id = p.id AND inv.variant_id = ''
     WHERE p.id = ? OR p.slug = ?`,
    [id, id]
  );
  if (!row) return failure("not_found", "No product found.");

  if (patch.expectedVersion !== undefined && patch.expectedVersion !== row.version) {
    return failure("conflict", "Someone else updated this product — reload to continue.");
  }

  // Category / brand must exist when being changed.
  let brandName = row.brand_name ?? "";
  if (patch.brandId !== undefined && patch.brandId !== row.brand_id) {
    const brand = await db.get<{ id: string; name: string }>(`SELECT id, name FROM brands WHERE id = ?`, [patch.brandId]);
    if (!brand) return failure("validation", "Choose a brand that exists.");
    brandName = brand.name;
  }
  if (patch.categoryId !== undefined && patch.categoryId !== row.category_id) {
    const category = await db.get<{ id: string }>(`SELECT id FROM categories WHERE id = ?`, [patch.categoryId]);
    if (!category) return failure("validation", "Choose a category that exists.");
  }

  // Money: resolve the final price/compare-at pair and keep the CHECK happy.
  const finalPriceCents = patch.priceCents ?? row.price_cents;
  const finalCompareCents =
    patch.compareAtCents !== undefined ? patch.compareAtCents : row.compare_at_cents;
  if (finalCompareCents !== null && finalCompareCents < finalPriceCents) {
    return failure("validation", "Compare-at price must be greater than or equal to the price.");
  }

  // Images replace-all: every referenced asset must exist (FK is RESTRICT).
  if (patch.images) {
    const assetIds = [...new Set(patch.images.map((img) => img.mediaAssetId))];
    for (let i = 0; i < assetIds.length; i += 90) {
      const chunk = assetIds.slice(i, i + 90);
      const placeholders = chunk.map(() => "?").join(",");
      const found = await db.all<{ id: string }>(
        `SELECT id FROM media_assets WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
        chunk
      );
      if (found.length !== chunk.length) {
        return failure("validation", "One of the selected images is no longer in the media library — remove it and save again.");
      }
    }
  }

  // Variants: updates/deletes must reference ids that belong to this product;
  // creates must be colour/origin rows with a valid optional image asset.
  if (
    (patch.variantUpdates && patch.variantUpdates.length > 0) ||
    (patch.variantDeletes && patch.variantDeletes.length > 0)
  ) {
    const variantRows = await db.all<{ id: string }>(`SELECT id FROM product_variants WHERE product_id = ?`, [row.id]);
    const owned = new Set(variantRows.map((v) => v.id));
    for (const update of patch.variantUpdates ?? []) {
      if (!owned.has(update.id)) {
        return failure("validation", "One of the variants no longer belongs to this product — reload and try again.");
      }
    }
    for (const deleteId of patch.variantDeletes ?? []) {
      if (!owned.has(deleteId)) {
        return failure("validation", "One of the variants to remove no longer belongs to this product — reload and try again.");
      }
    }
  }
  const createInputs = patch.variantCreates ?? [];
  for (const create of createInputs) {
    if (create.type !== "color" && create.type !== "origin") {
      return failure("validation", "New variants can only be colours or origins.");
    }
    if (!create.label.trim()) {
      return failure("validation", "Every new colour/origin needs a name.");
    }
  }
  // Attached variant photos must resolve to live media-library assets.
  const variantMediaIds = [
    ...createInputs.map((c) => c.imageMediaId).filter((id): id is string => Boolean(id)),
    ...(patch.variantUpdates ?? []).map((u) => u.imageMediaId).filter((id): id is string => Boolean(id)),
  ];
  if (variantMediaIds.length > 0) {
    const assetIds = [...new Set(variantMediaIds)];
    for (let i = 0; i < assetIds.length; i += 90) {
      const chunk = assetIds.slice(i, i + 90);
      const placeholders = chunk.map(() => "?").join(",");
      const found = await db.all<{ id: string }>(
        `SELECT id FROM media_assets WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
        chunk
      );
      if (found.length !== chunk.length) {
        return failure("validation", "One of the selected variant photos is no longer in the media library — pick it again and save.");
      }
    }
  }

  const now = new Date().toISOString();
  const statements: Array<{ sql: string; params?: unknown[] }> = [];

  // Product columns (single UPDATE, version bump included).
  const sets: string[] = [`version = version + 1`, `updated_at = ?`];
  const setParams: unknown[] = [now];
  const setColumn = (column: string, value: unknown) => {
    sets.push(`${column} = ?`);
    setParams.push(value);
  };
  if (patch.name !== undefined) setColumn("name", patch.name);
  if (patch.model !== undefined) setColumn("model", patch.model);
  if (patch.tagline !== undefined) setColumn("tagline", patch.tagline);
  if (patch.description !== undefined) setColumn("description", patch.description);
  if (patch.priceCents !== undefined) setColumn("price_cents", patch.priceCents);
  if (patch.compareAtCents !== undefined) setColumn("compare_at_cents", patch.compareAtCents);
  if (patch.featured !== undefined) setColumn("is_featured", patch.featured ? 1 : 0);
  if (patch.isNew !== undefined) setColumn("is_new", patch.isNew ? 1 : 0);
  if (patch.nicotineStrength !== undefined) setColumn("nicotine_strength", patch.nicotineStrength);
  if (patch.origin !== undefined) setColumn("origin", patch.origin);
  if (patch.keywords !== undefined) setColumn("keywords", patch.keywords);
  if (patch.lowStockThreshold !== undefined) setColumn("low_stock_threshold", patch.lowStockThreshold);
  if (patch.warnings !== undefined) setColumn("warnings_json", JSON.stringify(patch.warnings));
  if (patch.conformity !== undefined) setColumn("conformity_json", JSON.stringify(patch.conformity));
  if (patch.brandId !== undefined) setColumn("brand_id", patch.brandId);
  if (patch.categoryId !== undefined) setColumn("category_id", patch.categoryId);
  if (patch.setOutOfStock) setColumn("editorial_availability", "unavailable");
  else if (patch.clearOutOfStock) setColumn("editorial_availability", null);
  if (patch.publish !== undefined) setColumn("published_at", patch.publish ? (row.published_at ?? now) : null);
  if (patch.expectedVersion !== undefined) {
    // CAS predicate: the UPDATE only lands when the version is unchanged.
    statements.push({
      sql: `UPDATE products SET ${sets.join(", ")} WHERE id = ? AND version = ?`,
      params: [...setParams, row.id, row.version],
    });
  } else {
    statements.push({ sql: `UPDATE products SET ${sets.join(", ")} WHERE id = ?`, params: [...setParams, row.id] });
  }

  // Product-level stock.
  if (patch.restockQty !== undefined) {
    statements.push({
      sql: `INSERT INTO inventory (product_id, variant_id, qty_on_hand, qty_reserved, updated_at)
            VALUES (?, '', ?, 0, ?)
            ON CONFLICT(product_id, variant_id) DO UPDATE SET qty_on_hand = excluded.qty_on_hand, updated_at = excluded.updated_at`,
      params: [row.id, patch.restockQty, now],
    });
  }

  // Images replace-all (position = array index).
  if (patch.images) {
    statements.push({ sql: `DELETE FROM product_images WHERE product_id = ?`, params: [row.id] });
    patch.images.forEach((img, index) => {
      statements.push({
        sql: `INSERT INTO product_images (id, product_id, media_asset_id, alt, position) VALUES (?, ?, ?, ?, ?)`,
        params: [newId("img"), row.id, img.mediaAssetId, img.alt ?? null, index],
      });
    });
  }

  // Spec groups replace-all (entries cascade with their group).
  if (patch.specGroups) {
    statements.push({ sql: `DELETE FROM product_spec_groups WHERE product_id = ?`, params: [row.id] });
    patch.specGroups.forEach((group, gi) => {
      const groupId = newId("spg");
      statements.push({
        sql: `INSERT INTO product_spec_groups (id, product_id, title, position) VALUES (?, ?, ?, ?)`,
        params: [groupId, row.id, group.title, gi],
      });
      group.entries.forEach((entry, ei) => {
        statements.push({
          sql: `INSERT INTO product_spec_entries (id, group_id, label, value, position) VALUES (?, ?, ?, ?, ?)`,
          params: [newId("spe"), groupId, entry.label, entry.value, ei],
        });
      });
    });
  }

  // Documents replace-all.
  if (patch.documents) {
    statements.push({ sql: `DELETE FROM product_documents WHERE product_id = ?`, params: [row.id] });
    patch.documents.forEach((doc) => {
      statements.push({
        sql: `INSERT INTO product_documents (id, product_id, title, type, href, note) VALUES (?, ?, ?, ?, ?, ?)`,
        params: [newId("doc"), row.id, doc.title, doc.type, doc.href ?? null, doc.note ?? null],
      });
    });
  }

  // Variant deletes — colours/origins are freely editable; cart lines that
  // referenced a removed option resolve to a blocked line (never a crash).
  // Variant inventory rows for the removed option are cleaned up too.
  if (patch.variantDeletes) {
    for (const deleteId of patch.variantDeletes) {
      statements.push({
        sql: `DELETE FROM product_variants WHERE id = ? AND product_id = ?`,
        params: [deleteId, row.id],
      });
      statements.push({
        sql: `DELETE FROM inventory WHERE product_id = ? AND variant_id = ?`,
        params: [row.id, deleteId],
      });
    }
  }

  // Variant creates — append colour/origin rows after the current last row
  // of the same type.
  if (createInputs.length > 0) {
    for (const create of createInputs) {
      const maxRow = await db.get<{ max_pos: number | null }>(
        `SELECT MAX(position) AS max_pos FROM product_variants WHERE product_id = ? AND type = ?`,
        [row.id, create.type]
      );
      statements.push({
        sql: `INSERT INTO product_variants
                (id, product_id, label, type, swatch, meta, image_media_id, available, price_delta_cents, position)
              VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
        params: [
          newId("var"),
          row.id,
          create.label.trim(),
          create.type,
          create.swatch?.trim() || null,
          create.imageMediaId?.trim() || null,
          create.available === false ? 0 : 1,
          create.priceDeltaCents ?? 0,
          (maxRow?.max_pos ?? -1) + 1,
        ],
      });
    }
  }

  // Variant updates — availability / price / label / swatch / photo. Column
  // writes are dynamic: an undefined field keeps its current value.
  if (patch.variantUpdates) {
    for (const update of patch.variantUpdates) {
      const sets: string[] = ["available = ?", "price_delta_cents = ?"];
      const params: unknown[] = [update.available ? 1 : 0, update.priceDeltaCents];
      if (update.label !== undefined) {
        sets.push("label = ?");
        params.push(update.label);
      }
      if (update.swatch !== undefined) {
        sets.push("swatch = ?");
        params.push(update.swatch?.trim() || null);
      }
      if (update.imageMediaId !== undefined) {
        sets.push("image_media_id = ?");
        params.push(update.imageMediaId?.trim() || null);
      }
      statements.push({
        sql: `UPDATE product_variants SET ${sets.join(", ")} WHERE id = ? AND product_id = ?`,
        params: [...params, update.id, row.id],
      });
    }
  }

  // FTS reindex in the same batch — final editorial values are known here.
  statements.push({
    sql: `INSERT INTO product_fts (product_id, name, brand, tagline, description, keywords)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(product_id) DO UPDATE SET name = excluded.name, brand = excluded.brand,
            tagline = excluded.tagline, description = excluded.description, keywords = excluded.keywords`,
    params: [
      row.id,
      patch.name ?? row.name,
      brandName,
      patch.tagline ?? row.tagline,
      patch.description ?? row.description,
      patch.keywords !== undefined ? (patch.keywords ?? "") : (row.keywords ?? ""),
    ],
  });

  try {
    await db.batch(statements);
  } catch (error) {
    if (isForeignKeyError(error)) {
      return failure("validation", "A referenced record (image, category or brand) no longer exists — reload and try again.");
    }
    throw error;
  }

  const fresh = await db.get<{ version: number }>(`SELECT version FROM products WHERE id = ?`, [row.id]);
  if (patch.expectedVersion !== undefined && (fresh?.version ?? 0) !== row.version + 1) {
    return failure("conflict", "Someone else updated this product — reload to continue.");
  }
  invalidateCache("catalog:");
  return { ok: true, data: { version: fresh?.version ?? row.version + 1 } };
}

/* ------------------------------ delete product ---------------------------- */

export async function adminDeleteProduct(id: string): Promise<AdminResult<{ slug: string; name: string }>> {
  const db = await getDb();
  const row = await db.get<{ id: string; slug: string; name: string }>(
    `SELECT id, slug, name FROM products WHERE id = ? OR slug = ?`,
    [id, id]
  );
  if (!row) return failure("not_found", "No product found.");

  // FKs from cart_items/saved_items CASCADE and order_items SET NULL, so a
  // bare DELETE would silently wipe customer carts/saved lists and unlink
  // historical orders. Enforce the documented 409 contract explicitly.
  const refs = await db.get<{ c: number }>(
    `SELECT (SELECT COUNT(*) FROM order_items WHERE product_id = ?)
          +  (SELECT COUNT(*) FROM cart_items WHERE product_id = ?)
          +  (SELECT COUNT(*) FROM saved_items WHERE product_id = ?) AS c`,
    [row.id, row.id, row.id]
  );
  if ((refs?.c ?? 0) > 0) {
    return failure("conflict", "This product has orders, carts or saved references — unpublish it instead of deleting.");
  }

  try {
    // FTS is external-content: remove the index row before the product.
    await db.batch([
      { sql: `DELETE FROM product_fts WHERE product_id = ?`, params: [row.id] },
      { sql: `DELETE FROM products WHERE id = ?`, params: [row.id] },
    ]);
  } catch (error) {
    if (isForeignKeyError(error)) {
      return failure("conflict", "This product has orders or saved references — unpublish it instead of deleting.");
    }
    throw error;
  }
  invalidateCache("catalog:");
  return { ok: true, data: { slug: row.slug, name: row.name } };
}

/* ------------------------------ brands (admin) ---------------------------- */

export interface AdminBrandInput {
  name: string;
  slug?: string;
  tagline?: string;
  blurb?: string;
  description?: string;
  origin?: string;
  established?: string;
  accent?: Brand["accent"];
  featured?: boolean;
}

export async function adminCreateBrand(input: AdminBrandInput): Promise<AdminResult<{ id: string; slug: string }>> {
  const db = await getDb();
  const nameTaken = await db.get<{ id: string }>(`SELECT id FROM brands WHERE name = ?`, [input.name]);
  if (nameTaken) return failure("conflict", `A brand named "${input.name}" already exists.`);

  const slug = await uniqueSlug("brands", slugify(input.slug || input.name));
  const id = newId("brd");
  const now = new Date().toISOString();
  const tagline = input.tagline?.trim() || `${input.name} at TereaCOD`;
  const blurb = input.blurb?.trim() || `Authentic ${input.name} stock, delivered UAE-wide.`;

  await db.batch([
    {
      sql: `INSERT INTO brands (id, slug, name, tagline, blurb, description, origin, established, accent, featured, position, created_at, updated_at)
            SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(MAX(position), 0) + 1, ?, ? FROM brands`,
      params: [
        id,
        slug,
        input.name,
        tagline,
        blurb,
        input.description?.trim() || blurb,
        input.origin?.trim() || null,
        input.established?.trim() || null,
        input.accent ?? "violet",
        input.featured ? 1 : 0,
        now,
        now,
      ],
    },
  ]);
  invalidateCache("catalog:");
  return { ok: true, data: { id, slug } };
}

export async function adminUpdateBrand(
  id: string,
  patch: Partial<Pick<Brand, "name" | "tagline" | "blurb" | "description" | "origin" | "established" | "accent" | "featured">>
): Promise<AdminResult<{ id: string }>> {
  const db = await getDb();
  const row = await db.get<{ id: string; name: string }>(`SELECT id, name FROM brands WHERE id = ?`, [id]);
  if (!row) return failure("not_found", "No brand found.");

  if (patch.name !== undefined && patch.name !== row.name) {
    const taken = await db.get<{ id: string }>(`SELECT id FROM brands WHERE name = ? AND id != ?`, [patch.name, row.id]);
    if (taken) return failure("conflict", `A brand named "${patch.name}" already exists.`);
  }

  const sets: string[] = [`updated_at = ?`];
  const params: unknown[] = [new Date().toISOString()];
  const setColumn = (column: string, value: unknown) => {
    sets.push(`${column} = ?`);
    params.push(value);
  };
  if (patch.name !== undefined) setColumn("name", patch.name);
  if (patch.tagline !== undefined) setColumn("tagline", patch.tagline);
  if (patch.blurb !== undefined) setColumn("blurb", patch.blurb);
  if (patch.description !== undefined) setColumn("description", patch.description);
  if (patch.origin !== undefined) setColumn("origin", patch.origin);
  if (patch.established !== undefined) setColumn("established", patch.established);
  if (patch.accent !== undefined) setColumn("accent", patch.accent);
  if (patch.featured !== undefined) setColumn("featured", patch.featured ? 1 : 0);

  await db.run(`UPDATE brands SET ${sets.join(", ")} WHERE id = ?`, [...params, row.id]);
  invalidateCache("catalog:");
  return { ok: true, data: { id: row.id } };
}

export async function adminDeleteBrand(id: string): Promise<AdminResult<{ id: string }>> {
  const db = await getDb();
  const row = await db.get<{ id: string; name: string }>(`SELECT id, name FROM brands WHERE id = ?`, [id]);
  if (!row) return failure("not_found", "No brand found.");

  const refs = await db.get<{ c: number }>(`SELECT COUNT(*) AS c FROM products WHERE brand_id = ?`, [row.id]);
  if ((refs?.c ?? 0) > 0) {
    return failure("conflict", `${refs?.c} product${(refs?.c ?? 0) === 1 ? "" : "s"} still reference this brand — move them to another brand first.`);
  }

  try {
    await db.run(`DELETE FROM brands WHERE id = ?`, [row.id]);
  } catch (error) {
    if (isForeignKeyError(error)) {
      return failure("conflict", "Products still reference this brand — move them to another brand first.");
    }
    throw error;
  }
  invalidateCache("catalog:");
  return { ok: true, data: { id: row.id } };
}

/* ---------------------------- categories (admin) --------------------------- */

export interface AdminCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  longDescription?: string;
  accent?: CatalogCategory["accent"];
  featured?: boolean;
}

export async function adminCreateCategory(input: AdminCategoryInput): Promise<AdminResult<{ id: string; slug: string }>> {
  const db = await getDb();
  const slug = await uniqueSlug("categories", slugify(input.slug || input.name));
  const id = newId("cat");
  const now = new Date().toISOString();
  const description = input.description?.trim() || `${input.name} curated by the TereaCOD team.`;

  await db.batch([
    {
      sql: `INSERT INTO categories (id, slug, name, description, long_description, accent, featured, position, created_at, updated_at)
            SELECT ?, ?, ?, ?, ?, ?, ?, COALESCE(MAX(position), 0) + 1, ?, ? FROM categories`,
      params: [
        id,
        slug,
        input.name,
        description,
        input.longDescription?.trim() || null,
        input.accent ?? "violet",
        input.featured ? 1 : 0,
        now,
        now,
      ],
    },
  ]);
  invalidateCache("catalog:");
  return { ok: true, data: { id, slug } };
}

export async function adminUpdateCategory(
  id: string,
  patch: Partial<Pick<CatalogCategory, "name" | "description" | "accent" | "featured"> & { longDescription?: string | null }>
): Promise<AdminResult<{ id: string }>> {
  const db = await getDb();
  const row = await db.get<{ id: string }>(`SELECT id FROM categories WHERE id = ?`, [id]);
  if (!row) return failure("not_found", "No category found.");

  const sets: string[] = [`updated_at = ?`];
  const params: unknown[] = [new Date().toISOString()];
  const setColumn = (column: string, value: unknown) => {
    sets.push(`${column} = ?`);
    params.push(value);
  };
  if (patch.name !== undefined) setColumn("name", patch.name);
  if (patch.description !== undefined) setColumn("description", patch.description);
  if (patch.longDescription !== undefined) setColumn("long_description", patch.longDescription);
  if (patch.accent !== undefined) setColumn("accent", patch.accent);
  if (patch.featured !== undefined) setColumn("featured", patch.featured ? 1 : 0);

  await db.run(`UPDATE categories SET ${sets.join(", ")} WHERE id = ?`, [...params, row.id]);
  invalidateCache("catalog:");
  return { ok: true, data: { id: row.id } };
}

export async function adminDeleteCategory(id: string): Promise<AdminResult<{ id: string }>> {
  const db = await getDb();
  const row = await db.get<{ id: string; name: string }>(`SELECT id, name FROM categories WHERE id = ?`, [id]);
  if (!row) return failure("not_found", "No category found.");

  const refs = await db.get<{ c: number }>(`SELECT COUNT(*) AS c FROM products WHERE category_id = ?`, [row.id]);
  if ((refs?.c ?? 0) > 0) {
    return failure("conflict", `${refs?.c} product${(refs?.c ?? 0) === 1 ? "" : "s"} still sit in this category — move them first.`);
  }

  try {
    await db.run(`DELETE FROM categories WHERE id = ?`, [row.id]);
  } catch (error) {
    if (isForeignKeyError(error)) {
      return failure("conflict", "Products still reference this category — move them first.");
    }
    throw error;
  }
  invalidateCache("catalog:");
  return { ok: true, data: { id: row.id } };
}
