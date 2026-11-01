import type {
  AdminCustomer,
  AdminProductDetail,
  AdminProductListResult,
  AdminProductPatch,
  AdminRole,
  AdminStaffMember,
  AuditEvent,
  Brand,
  CatalogCategory,
  OrderSummary,
  SupportTicket,
} from "@/types";

/**
 * ADMIN SERVICE (API-backed)
 * --------------------------
 * Every call requires a staff session (RBAC enforced server-side).
 */

const delay = 0;

export interface AdminOverview {
  mediaAssets: number;
  catalogRecords: number;
  brands: number;
  customers: number;
  orders: number;
  openTickets: number;
  recentActivity: AuditEvent[];
}

async function getData<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Your session does not have access to this area."
        : `Request failed (${response.status})`
    );
  }
  const body = (await response.json()) as { data: T };
  return body.data;
}

/** POST/PATCH/DELETE helper — parses the standard envelope, surfaces API messages. */
async function sendData<T>(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? { accept: "application/json" } : { accept: "application/json", "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Request failed (${response.status})`);
  }
  return payload.data as T;
}

export const adminService = {
  async overview(): Promise<AdminOverview> {
    void delay;
    return getData<AdminOverview>("/api/v1/admin/overview");
  },

  async customers(query: { search?: string; status?: AdminCustomer["status"] | "all" } = {}): Promise<AdminCustomer[]> {
    const params = new URLSearchParams();
    if (query.search) params.set("q", query.search);
    if (query.status) params.set("status", query.status);
    const data = await getData<{ items: AdminCustomer[] }>(`/api/v1/admin/customers?${params.toString()}`);
    return data.items;
  },

  async customer(id: string): Promise<AdminCustomer | null> {
    const customers = await this.customers();
    return customers.find((c) => c.id === id) ?? null;
  },

  /** Activate / suspend a customer account. */
  async updateCustomer(id: string, patch: { status: "active" | "suspended"; reason?: string }): Promise<void> {
    await sendData(`/api/v1/admin/customers/${id}`, "PATCH", patch);
  },

  async roles(): Promise<AdminRole[]> {
    const data = await getData<{ roles: AdminRole[] }>("/api/v1/admin/users");
    return data.roles;
  },

  /** Live staff list + role catalog (GET /api/v1/admin/users). */
  async staff(): Promise<{ staff: AdminStaffMember[]; roles: AdminRole[] }> {
    return getData<{ staff: AdminStaffMember[]; roles: AdminRole[] }>("/api/v1/admin/users");
  },

  /**
   * Create a staff or customer account with a temporary password.
   * Returns the generated password when none was supplied.
   */
  async createUser(payload: {
    email: string;
    displayName: string;
    password?: string;
    roleSlug?: string;
    kind: "staff" | "customer";
  }): Promise<{ id: string; email: string; tempPassword?: string }> {
    return sendData("/api/v1/admin/users", "POST", payload);
  },

  async auditLog(query: { severity?: AuditEvent["severity"] | "all"; search?: string; page?: number; pageSize?: number } = {}): Promise<{ items: AuditEvent[]; total: number }> {
    const params = new URLSearchParams();
    if (query.severity) params.set("severity", query.severity);
    if (query.search) params.set("q", query.search);
    params.set("page", String(query.page ?? 1));
    params.set("pageSize", String(query.pageSize ?? 24));
    const response = await fetch(`/api/v1/admin/audit-log?${params.toString()}`, { headers: { accept: "application/json" } });
    if (!response.ok) {
      throw new Error(response.status === 401 || response.status === 403 ? "Your session does not have access to this area." : `Request failed (${response.status})`);
    }
    const body = (await response.json()) as { data: AuditEvent[]; meta?: { pagination?: { total?: number } } };
    return { items: body.data, total: body.meta?.pagination?.total ?? body.data.length };
  },

  /** Order summaries for the admin orders table (server-side search + paging). */
  async orders(query: { status?: string; search?: string; page?: number; pageSize?: number } = {}): Promise<{ items: OrderSummary[]; total: number }> {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.search) params.set("q", query.search);
    params.set("page", String(query.page ?? 1));
    params.set("pageSize", String(query.pageSize ?? 24));
    return getData<{ items: OrderSummary[]; total: number }>(`/api/v1/admin/orders?${params.toString()}`);
  },

  /* ------------------------------ catalog ------------------------------ */

  /** Admin product list — includes drafts; server-side search/filter/paging. */
  async products(
    query: { q?: string; categoryId?: string; brandId?: string; status?: "all" | "published" | "draft"; page?: number; pageSize?: number } = {}
  ): Promise<AdminProductListResult> {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.categoryId) params.set("categoryId", query.categoryId);
    if (query.brandId) params.set("brandId", query.brandId);
    if (query.status) params.set("status", query.status);
    params.set("page", String(query.page ?? 1));
    params.set("pageSize", String(query.pageSize ?? 24));
    return getData<AdminProductListResult>(`/api/v1/admin/products?${params.toString()}`);
  },

  async product(id: string): Promise<AdminProductDetail> {
    return getData<AdminProductDetail>(`/api/v1/admin/products/${id}`);
  },

  /** Creates a DRAFT product (unpublished, zero stock) and returns its id. */
  async createProduct(payload: {
    name: string;
    slug?: string;
    sku: string;
    categoryId: string;
    brandId: string;
    priceCents: number;
    tagline?: string;
    description?: string;
  }): Promise<{ id: string; slug: string }> {
    return sendData("/api/v1/admin/products", "POST", payload);
  },

  async updateProduct(id: string, patch: AdminProductPatch): Promise<{ version: number }> {
    return sendData(`/api/v1/admin/products/${id}`, "PATCH", patch);
  },

  /**
   * Hard-deletes a product. Fails with the API message (409) when orders,
   * carts or saved items still reference it — unpublish instead.
   */
  async deleteProduct(id: string): Promise<void> {
    await sendData(`/api/v1/admin/products/${id}`, "DELETE");
  },

  async createBrand(payload: { name: string; slug?: string; tagline?: string; blurb?: string; description?: string; origin?: string; established?: string; accent?: Brand["accent"]; featured?: boolean }): Promise<{ id: string; slug: string }> {
    return sendData("/api/v1/admin/brands", "POST", payload);
  },

  async updateBrand(id: string, patch: Partial<Pick<Brand, "name" | "tagline" | "blurb" | "description" | "origin" | "established" | "accent" | "featured">>): Promise<void> {
    await sendData(`/api/v1/admin/brands/${id}`, "PATCH", patch);
  },

  async deleteBrand(id: string): Promise<void> {
    await sendData(`/api/v1/admin/brands/${id}`, "DELETE");
  },

  async createCategory(payload: { name: string; slug?: string; description?: string; longDescription?: string | null; accent?: CatalogCategory["accent"]; featured?: boolean }): Promise<{ id: string; slug: string }> {
    return sendData("/api/v1/admin/categories", "POST", payload);
  },

  async updateCategory(id: string, patch: Partial<Pick<CatalogCategory, "name" | "description" | "accent" | "featured"> & { longDescription?: string | null }>): Promise<void> {
    await sendData(`/api/v1/admin/categories/${id}`, "PATCH", patch);
  },

  async deleteCategory(id: string): Promise<void> {
    await sendData(`/api/v1/admin/categories/${id}`, "DELETE");
  },

  /** Alt text / metadata patch for a media asset. */
  async updateMedia(id: string, patch: { alt?: string }): Promise<void> {
    await sendData(`/api/v1/admin/media/${id}`, "PATCH", patch);
  },

  /** Tickets for the admin support screens. */
  async tickets(query: { status?: string; priority?: string; search?: string } = {}): Promise<SupportTicket[]> {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.priority) params.set("priority", query.priority);
    if (query.search) params.set("q", query.search);
    const data = await getData<{ items: SupportTicket[] }>(`/api/v1/admin/tickets?${params.toString()}`);
    return data.items;
  },
};
