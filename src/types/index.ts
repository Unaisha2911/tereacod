/**
 * TereaCOD — Frontend domain types.
 *
 * These models describe everything the UI renders. During the frontend
 * phase every value is served from mock adapters (src/services/*) backed
 * by typed mock data (src/data/*). The shapes are designed so a future
 * Cloudflare D1 + R2 backend can implement the same contracts.
 */

/* ----------------------------- Site ------------------------------- */

export interface SiteSettings {
  brandName: string;
  brandLegalName: string;
  tagline: string;
  description: string;
  locale: string;
  currency: string;
  contact: {
    email: string;
    supportEmail: string;
    phone: string;
    whatsapp?: string;
    addressLines: string[];
    hours: string;
  };
  social: Array<{ id: string; label: string; href: string }>;
  seo: { titleTemplate: string; defaultDescription: string };
  complianceNotice: string;
  ageRestrictionNotice: string;
  smokePreset: "ambient" | "cinematic" | "reduced";
  animationIntensity: number; // 0..1 — admin-configurable
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  description?: string;
  icon?: string;
  badge?: string;
  children?: NavigationItem[];
  sortOrder: number;
  enabled: boolean;
  location: "header" | "footer-column-1" | "footer-column-2" | "footer-column-3" | "mobile" | "legal";
}

/* ---------------------------- Catalog ----------------------------- */

export type Availability = "in_stock" | "low_stock" | "out_of_stock" | "unavailable";

export interface SpecificationEntry {
  label: string;
  value: string;
}

export interface SpecificationGroup {
  title: string;
  entries: SpecificationEntry[];
}

export interface ItemVariant {
  id: string;
  label: string;
  type: "flavor" | "color" | "origin" | "capacity" | "nicotine";
  swatch?: string;
  available: boolean;
  meta?: string;
  /** Price delta vs the base product price, in AED (fils-derived). */
  priceDelta?: number;
  /** Per-variant gallery photo — selecting this variant on the product
   *  page swaps the main image (colour/origin photography). */
  imageUrl?: string;
}

export interface ConformityInfo {
  label: string;
  detail?: string;
  status: "verified" | "pending" | "missing";
}

export interface DocumentRef {
  id: string;
  title: string;
  type: "pdf" | "web";
  href?: string;
  note?: string;
}

export interface CatalogCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription?: string;
  image?: string;
  itemCount: number;
  featured?: boolean;
  accent: "violet" | "ice" | "magenta";
}

/**
 * A vapor brand stocked at the TereaCOD shop. TereaCOD itself is the
 * storefront, not a device maker — every device/liquid record belongs
 * to one of these brands and lives at /brand/<slug>.
 */
export interface Brand {
  id: string;
  slug: string;
  name: string;
  /** Short LED-chip line used on tiles and headers. */
  tagline: string;
  /** One-liner for cards/chips. */
  blurb: string;
  /** Longer paragraph for the brand landing page. */
  description: string;
  origin: string;
  established: string;
  accent: "violet" | "ice" | "magenta";
  featured?: boolean;
}

export interface CatalogItem {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categorySlug: string;
  sku: string;
  model?: string;
  tagline: string;
  description: string;
  /** Price in AED (whole dirhams in the mock catalog). */
  price: number;
  /** Optional original price — renders as a strikethrough "was" price. */
  compareAtPrice?: number;
  images: string[];
  specs: SpecificationGroup[];
  variants: ItemVariant[];
  compatibility?: string[];
  origin?: string;
  conformity: ConformityInfo[];
  warnings: string[];
  documents: DocumentRef[];
  availability: Availability;
  featured?: boolean;
  isNew?: boolean;
  nicotineStrength?: string;
  /** UAE law: nicotine products are 18+; accessories (coils, cables) may not be. */
  ageRestricted: boolean;
  faqs?: Array<{ question: string; answer: string }>;
  relatedSlugs?: string[];
}

/* ------------------------ Admin catalog (console) ----------------------- */
/* Contracts shared between /api/v1/admin/* and the admin console UI. */

export interface AdminProductImage {
  /** Existing DB row id, or null for images not yet persisted. */
  id: string | null;
  mediaAssetId: string;
  url: string;
  alt: string | null;
}

export interface AdminProductVariant {
  id: string;
  label: string;
  type: ItemVariant["type"];
  swatch: string | null;
  available: boolean;
  priceDeltaCents: number;
  /** Attached gallery photo (colour/origin imagery) — null when unset. */
  imageMediaId: string | null;
  imageUrl: string | null;
}

export interface AdminProductSpecEntry {
  id: string | null;
  label: string;
  value: string;
}

export interface AdminProductSpecGroup {
  id: string | null;
  title: string;
  entries: AdminProductSpecEntry[];
}

export interface AdminProductDocument {
  id: string | null;
  title: string;
  type: "pdf" | "web";
  href: string | null;
  note: string | null;
}

export interface AdminProductSummary {
  id: string;
  slug: string;
  name: string;
  sku: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  /** Sourcing line chosen in the admin dropdown (products.origin column). */
  origin: string | null;
  priceCents: number;
  compareAtCents: number | null;
  /** published_at IS NOT NULL */
  published: boolean;
  publishedAt: string | null;
  featured: boolean;
  isNew: boolean;
  availability: Availability;
  /** Product-level on-hand qty from the inventory table (variant_id = ''). */
  qtyOnHand: number;
  version: number;
  updatedAt: string;
}

export interface AdminProductDetail extends AdminProductSummary {
  model: string | null;
  tagline: string;
  description: string;
  nicotineStrength: string | null;
  ageRestricted: boolean;
  keywords: string | null;
  lowStockThreshold: number;
  warnings: string[];
  conformity: ConformityInfo[];
  images: AdminProductImage[];
  variants: AdminProductVariant[];
  specGroups: AdminProductSpecGroup[];
  documents: AdminProductDocument[];
}

export interface AdminProductListResult {
  items: AdminProductSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Full editor patch — replace-all semantics for child collections
 * (images / specGroups / documents), UPDATE-only for flavour/capacity/
 * nicotine variants (carts reference their ids), full add/edit/delete for
 * colour and origin variants (safe — cart lines referencing a removed
 * option degrade to a blocked line, never a crash), column writes for the
 * rest.
 */
export interface AdminProductPatch {
  name?: string;
  model?: string | null;
  tagline?: string;
  description?: string;
  priceCents?: number;
  compareAtCents?: number | null;
  featured?: boolean;
  isNew?: boolean;
  nicotineStrength?: string | null;
  origin?: string | null;
  keywords?: string | null;
  lowStockThreshold?: number;
  warnings?: string[];
  conformity?: ConformityInfo[];
  images?: AdminProductImage[];
  specGroups?: AdminProductSpecGroup[];
  documents?: AdminProductDocument[];
  variantUpdates?: Array<{
    id: string;
    label?: string;
    available?: boolean;
    priceDeltaCents?: number;
    swatch?: string | null;
    imageMediaId?: string | null;
  }>;
  /** New colour/origin variants to append (colour may carry a swatch hex). */
  variantCreates?: Array<{
    type: "color" | "origin";
    label: string;
    swatch?: string | null;
    available?: boolean;
    priceDeltaCents?: number;
    imageMediaId?: string | null;
  }>;
  /** Variant ids to remove (must belong to this product). */
  variantDeletes?: string[];
  restockQty?: number;
  setOutOfStock?: boolean;
  clearOutOfStock?: boolean;
  publish?: boolean;
  categoryId?: string;
  brandId?: string;
  /** Optimistic concurrency — 409 when the server version differs. */
  expectedVersion?: number;
}

export interface AdminStaffMember {
  id: string;
  email: string;
  displayName: string;
  roleSlugs: string[];
  roleNames: string[];
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

/* ----------------------------- Media ------------------------------ */

export interface MediaAsset {
  id: string;
  name: string;
  type: "image" | "video" | "document";
  format: string;
  sizeLabel: string;
  dimensions?: string;
  folder: string;
  uploadedAt: string;
  alt?: string;
  url: string;
  status: "ready" | "processing" | "failed";
}

/* ---------------------------- Account ----------------------------- */

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  joinedAt: string;
  initials: string;
  verification: "verified" | "unverified" | "pending";
  locale: string;
}

export interface AccountPreferences {
  language: string;
  communications: {
    productUpdates: boolean;
    orderUpdates: boolean;
    researchInvites: boolean;
  };
  privacy: {
    personalization: boolean;
    analytics: boolean;
  };
  accessibility: {
    reducedMotion: boolean;
  };
}

export interface SavedItem {
  itemId: string;
  savedAt: string;
  note?: string;
}

/* ----------------------------- Orders ----------------------------- */

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItemPreview {
  name: string;
  quantity: number;
}

export interface OrderSummary {
  reference: string;
  placedAt: string;
  status: OrderStatus;
  itemCount: number;
  itemsPreview: OrderItemPreview[];
  totalLabel: string;
  fulfilmentLabel: string;
}

export interface TimelineEvent {
  id: string;
  label: string;
  at: string;
  completed: boolean;
  note?: string;
}

/* ------------------------------ Cart ------------------------------ */

/** A raw cart line as stored in the cart store. `variantId` holds ALL
 *  selected option ids joined with "|" (e.g. "var_a|var_b") — one id per
 *  option group — or null when the product has no variants. */
export interface CartLine {
  productSlug: string;
  /** Selected variant ids joined with "|", or null when none. */
  variantId: string | null;
  qty: number;
}

/** A cart line resolved against the catalog. Stale lines are dropped. */
export interface CartLineDetail {
  /** Stable line key — `${productSlug}:${variantId ?? "-"}`. */
  key: string;
  product: CatalogItem;
  /** All selected option variants (flavour, colour, origin, …). */
  variants: ItemVariant[];
  /** Combined option label, e.g. "Midnight Blue · Japan". */
  variantLabel?: string;
  qty: number;
  /** Base price plus the summed priceDelta of every selected variant. */
  unitPrice: number;
  lineTotal: number;
  /** Unavailable products/variants are shown but excluded from totals. */
  blocked: boolean;
  blockedReason?: string;
}

export interface CartTotals {
  subtotal: number;
  deliveryFee: number;
  total: number;
  /** Total unit count across purchasable (non-blocked) lines. */
  itemCount: number;
}

export interface CartDetail {
  lines: CartLineDetail[];
  totals: CartTotals;
  hasBlocked: boolean;
}

export type DeliveryMethod = "standard" | "express";
export type PaymentMethod = "cash-on-delivery" | "card-on-delivery" | "saved-card";

export interface OrderDetail {
  reference: string;
  placedAt: string;
  status: OrderStatus;
  timeline: TimelineEvent[];
  items: Array<{
    name: string;
    brand: string;
    quantity: number;
    variantLabel?: string;
    lineTotalLabel: string;
    image?: string;
  }>;
  statusHistory: Array<{ status: OrderStatus; at: string; note?: string }>;
  supportHref: string;
  documents: DocumentRef[];
  deliveryLabel: string;
  paymentLabel: string;
  totalLabel: string;
  /** Admin-facing customer identity (undefined on customer-facing copies). */
  customer?: { name: string; email: string; isGuest: boolean };
  /** Admin-facing shipping address (undefined on customer-facing copies). */
  shippingAddress?: {
    fullName: string;
    phone: string;
    emirate: string;
    city: string;
    street: string;
    building?: string | null;
    apartment?: string | null;
  };
}

/* ----------------------------- Support ---------------------------- */

export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export interface TicketMessage {
  id: string;
  author: string;
  role: "customer" | "agent" | "system";
  body: string;
  at: string;
}

export interface SupportTicket {
  id: string;
  reference: string;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  requester: string;
  messages: TicketMessage[];
  internalNotes?: Array<{ id: string; author: string; body: string; at: string }>;
}

/* ----------------------------- Legal ------------------------------ */

export interface LegalDocumentSection {
  id: string;
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  version: string;
  summary: string;
  sections: LegalDocumentSection[];
}

export interface ComplianceRecord {
  id: string;
  area: string;
  title: string;
  description: string;
  status: "verified" | "pending" | "missing" | "expired";
  lastReviewed?: string;
  expiresAt?: string;
  owner?: string;
  documents: DocumentRef[];
}

/* ----------------------------- Admin ------------------------------ */

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  members: number;
  system: boolean;
}

export type AuditSeverity = "info" | "warning" | "critical";

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  severity: AuditSeverity;
  detail: string;
  ip?: string;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  status: "active" | "suspended" | "pending";
  joinedAt: string;
  ordersCount: number;
  privacyRequest?: "access" | "deletion" | null;
  supportTickets: number;
}

/* ---------------------------- Services ---------------------------- */

/** Unified list response so future D1-backed adapters can paginate. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
