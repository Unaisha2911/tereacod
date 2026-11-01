/**
 * TereaCOD — RBAC. Roles/permissions live in D1 (seeded below); the admin
 * surface is any user holding at least one role. The API is the enforcement
 * point — UI hiding is cosmetic only.
 */

import { getDb } from "@/server/db/client";
import { cached, CACHE_TTL } from "@/server/cache";

export interface UserRoles {
  roles: Array<{ id: string; slug: string; name: string }>;
  permissions: Set<string>;
}

export const PERMISSION_SLUGS = [
  "catalog.read",
  "catalog.write",
  "media.read",
  "media.write",
  "orders.read",
  "orders.operate",
  "orders.refund",
  "customers.read",
  "customers.manage",
  "support.read",
  "support.operate",
  "staff.manage",
  "settings.write",
  "content.write",
  "audit.read",
  "privacy.manage",
] as const;

export type PermissionSlug = (typeof PERMISSION_SLUGS)[number];

/** Seed roles — mirror the semantics of the original ADMIN_ROLES mock. */
export const ROLE_SEED: Array<{
  slug: string;
  name: string;
  description: string;
  permissions: PermissionSlug[] | "*";
}> = [
  {
    slug: "super-admin",
    name: "Super admin",
    description: "Full console access including staff, roles and settings.",
    permissions: "*",
  },
  {
    slug: "catalog-manager",
    name: "Catalog manager",
    description: "Manages products, categories, brands and the media library.",
    permissions: ["catalog.read", "catalog.write", "media.read", "media.write"],
  },
  {
    slug: "order-ops",
    name: "Order operations",
    description: "Fulfils orders, updates fulfilment status and handles refunds.",
    permissions: ["catalog.read", "orders.read", "orders.operate", "orders.refund", "customers.read"],
  },
  {
    slug: "support-agent",
    name: "Support agent",
    description: "Works the support inbox and customer questions.",
    permissions: ["orders.read", "customers.read", "support.read", "support.operate"],
  },
  {
    slug: "viewer",
    name: "Viewer",
    description: "Read-only console access for reporting.",
    permissions: ["catalog.read", "orders.read", "customers.read", "support.read"],
  },
];

export async function getUserPermissionSet(userId: string): Promise<UserRoles> {
  // Resolved for EVERY authenticated request (site pages + API guard).
  // Memoized briefly per user; invalidated on role/permission writes by the
  // admin users/roles routes via invalidateCache("rbac:").
  return cached(`rbac:user:${userId}`, CACHE_TTL.rbac, async () => {
  const db = await getDb();
  const rows = await db.all<{ slug: string; name: string; id: string; permission_slug: string | null }>(
    `SELECT r.id, r.slug, r.name, rp.permission_slug
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     WHERE ur.user_id = ?`,
    [userId]
  );

  const rolesMap = new Map<string, { id: string; slug: string; name: string }>();
  const permissions = new Set<string>();
  for (const row of rows) {
    rolesMap.set(row.id, { id: row.id, slug: row.slug, name: row.name });
    if (row.permission_slug) permissions.add(row.permission_slug);
  }

  // Wildcard: super-admin passes every check.
  for (const role of rolesMap.values()) {
    if (role.slug === "super-admin") {
      permissions.add("*");
    }
  }

  return { roles: [...rolesMap.values()], permissions };
  });
}

export function hasPermission(roles: UserRoles, permission: PermissionSlug): boolean {
  return roles.permissions.has("*") || roles.permissions.has(permission);
}

export function isStaff(roles: UserRoles): boolean {
  return roles.roles.length > 0;
}
