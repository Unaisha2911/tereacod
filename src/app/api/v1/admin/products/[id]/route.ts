import { z } from "zod";
import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { adminGetProduct, adminUpdateProduct, adminDeleteProduct } from "@/server/repos/catalog";
import type { AdminProductPatch } from "@/types";
import { aedToFils } from "@/server/money";
import { logAudit } from "@/server/audit";

/** GET /api/v1/admin/products/:id — full editor detail (id or slug). */
export const GET = withApi({ requirePermission: "catalog.read" }, async ({ params }) => {
  const detail = await adminGetProduct(params.id);
  if (!detail) return fail(404, ErrorCode.NOT_FOUND, "No product found.");
  return ok(detail);
});

const imageSchema = z.object({
  id: z.string().nullable(),
  mediaAssetId: z.string().min(1),
  url: z.string().max(600),
  alt: z.string().max(300).nullable(),
});

const specEntrySchema = z.object({
  id: z.string().nullable(),
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().max(300),
});

const patchSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  model: z.string().trim().max(80).nullable().optional(),
  tagline: z.string().trim().min(1).max(240).optional(),
  description: z.string().trim().min(1).max(4000).optional(),
  // Fils-based contract fields (AdminProductPatch).
  priceCents: z.number().int().min(0).max(10_000_000).optional(),
  compareAtCents: z.number().int().min(0).max(10_000_000).nullable().optional(),
  // Legacy AED fields kept for backwards compatibility with the quick editor.
  price: z.number().min(0).max(100_000).optional(),
  compareAtPrice: z.number().min(0).max(100_000).nullable().optional(),
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  nicotineStrength: z.string().trim().max(80).nullable().optional(),
  origin: z.string().trim().max(80).nullable().optional(),
  keywords: z.string().trim().max(500).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).max(9999).optional(),
  warnings: z.array(z.string().trim().min(1).max(300)).max(30).optional(),
  conformity: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(200),
        detail: z.string().trim().max(500).optional(),
        status: z.enum(["verified", "pending", "missing"]),
      })
    )
    .max(40)
    .optional(),
  images: z.array(imageSchema).max(24).optional(),
  specGroups: z
    .array(
      z.object({
        id: z.string().nullable(),
        title: z.string().trim().min(1).max(120),
        entries: z.array(specEntrySchema).max(40),
      })
    )
    .max(16)
    .optional(),
  documents: z
    .array(
      z.object({
        id: z.string().nullable(),
        title: z.string().trim().min(1).max(200),
        type: z.enum(["pdf", "web"]),
        href: z.string().trim().max(600).nullable(),
        note: z.string().trim().max(300).nullable(),
      })
    )
    .max(16)
    .optional(),
  variantUpdates: z
    .array(
      z.object({
        id: z.string().min(1),
        available: z.boolean(),
        priceDeltaCents: z.number().int().min(-10_000_000).max(10_000_000),
        label: z.string().trim().min(1).max(120).optional(),
        swatch: z
          .string()
          .trim()
          .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Swatch must be a hex colour")
          .nullable()
          .optional(),
        imageMediaId: z.string().trim().min(1).max(120).nullable().optional(),
      })
    )
    .max(40)
    .optional(),
  variantCreates: z
    .array(
      z.object({
        type: z.enum(["color", "origin"]),
        label: z.string().trim().min(1).max(120),
        swatch: z
          .string()
          .trim()
          .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Swatch must be a hex colour")
          .nullable()
          .optional(),
        available: z.boolean().optional(),
        priceDeltaCents: z.number().int().min(-10_000_000).max(10_000_000).optional(),
        imageMediaId: z.string().trim().min(1).max(120).nullable().optional(),
      })
    )
    .max(40)
    .optional(),
  variantDeletes: z.array(z.string().min(1)).max(40).optional(),
  restockQty: z.number().int().min(0).max(999_999).optional(),
  setOutOfStock: z.boolean().optional(),
  clearOutOfStock: z.boolean().optional(),
  publish: z.boolean().optional(),
  categoryId: z.string().trim().min(1).optional(),
  brandId: z.string().trim().min(1).optional(),
  expectedVersion: z.number().int().min(1).optional(),
});

/**
 * PATCH /api/v1/admin/products/:id — full editor patch.
 * Optimistic concurrency via expectedVersion (409), FTS reindexed in-batch.
 */
export const PATCH = withApi(
  { requirePermission: "catalog.write" },
  async ({ request, params, identity, meta }) => {
    const body = patchSchema.parse(await request.json());

    // Normalize legacy AED fields onto the fils contract fields.
    const priceCents =
      body.priceCents ?? (body.price !== undefined ? aedToFils(body.price) : undefined);
    const compareAtCents =
      body.compareAtCents !== undefined
        ? body.compareAtCents
        : body.compareAtPrice !== undefined
          ? body.compareAtPrice === null
            ? null
            : aedToFils(body.compareAtPrice)
          : undefined;

    const patch: AdminProductPatch = {
      name: body.name,
      model: body.model,
      tagline: body.tagline,
      description: body.description,
      priceCents,
      compareAtCents,
      featured: body.featured,
      isNew: body.isNew,
      nicotineStrength: body.nicotineStrength,
      origin: body.origin,
      keywords: body.keywords,
      lowStockThreshold: body.lowStockThreshold,
      warnings: body.warnings,
      conformity: body.conformity?.map((c) => ({
        label: c.label,
        detail: c.detail ?? undefined,
        status: c.status,
      })),
      images: body.images,
      specGroups: body.specGroups,
      documents: body.documents,
      variantUpdates: body.variantUpdates,
      variantCreates: body.variantCreates,
      variantDeletes: body.variantDeletes,
      restockQty: body.restockQty,
      setOutOfStock: body.setOutOfStock,
      clearOutOfStock: body.clearOutOfStock,
      publish: body.publish,
      categoryId: body.categoryId,
      brandId: body.brandId,
      expectedVersion: body.expectedVersion,
    };

    const result = await adminUpdateProduct(params.id, patch);
    if (!result.ok) {
      if (result.failure.code === "not_found") return fail(404, ErrorCode.NOT_FOUND, result.failure.message);
      if (result.failure.code === "conflict") return fail(409, ErrorCode.CONFLICT, result.failure.message);
      return fail(422, ErrorCode.VALIDATION_FAILED, result.failure.message);
    }

    await logAudit({
      actorType: "admin",
      actorId: identity!.user.id,
      actorLabel: identity!.user.displayName,
      action: "product.update",
      targetType: "prd",
      targetId: params.id,
      detail:
        (body.variantCreates?.length ?? 0) > 0 || (body.variantDeletes?.length ?? 0) > 0
          ? `Updated product catalog record (+${body.variantCreates?.length ?? 0} variants, -${body.variantDeletes?.length ?? 0} removed)`
          : "Updated product catalog record",
      before: { expectedVersion: body.expectedVersion ?? null },
      after: { keys: Object.keys(patch) },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ version: result.data.version });
  }
);

/**
 * DELETE /api/v1/admin/products/:id — hard delete (FTS row removed first).
 * Referenced by orders/carts/saved items → 409; unpublish instead.
 */
export const DELETE = withApi(
  { requirePermission: "catalog.write" },
  async ({ params, identity, meta }) => {
    const result = await adminDeleteProduct(params.id);
    if (!result.ok) {
      if (result.failure.code === "not_found") return fail(404, ErrorCode.NOT_FOUND, result.failure.message);
      return fail(409, ErrorCode.CONFLICT, result.failure.message);
    }

    await logAudit({
      actorType: "admin",
      actorId: identity!.user.id,
      actorLabel: identity!.user.displayName,
      action: "product.delete",
      targetType: "prd",
      targetId: result.data.slug,
      severity: "warning",
      detail: `Deleted product "${result.data.name}"`,
      before: { slug: result.data.slug, name: result.data.name },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  }
);
