import { z } from "zod";
import { withApi, ok, fail, created, ErrorCode } from "@/server/api/guard";
import { adminListProducts, adminCreateProduct } from "@/server/repos/catalog";
import { logAudit } from "@/server/audit";

/**
 * GET /api/v1/admin/products — admin catalog list (drafts included).
 * Query: q, categoryId, brandId, status=all|published|draft, page, pageSize (max 96).
 */
export const GET = withApi({ requirePermission: "catalog.read" }, async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const result = await adminListProducts({
    q: searchParams.get("q") ?? undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
    brandId: searchParams.get("brandId") ?? undefined,
    status: statusParam === "published" || statusParam === "draft" ? statusParam : "all",
    page: Number(searchParams.get("page") ?? 1) || 1,
    pageSize: Number(searchParams.get("pageSize") ?? 24) || 24,
  });
  return ok(result);
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(64),
  categoryId: z.string().trim().min(1),
  brandId: z.string().trim().min(1),
  priceCents: z.number().int().min(0).max(10_000_000),
  slug: z.string().trim().min(1).max(80).optional(),
  tagline: z.string().trim().min(1).max(240).optional(),
  description: z.string().trim().min(1).max(4000).optional(),
});

/**
 * POST /api/v1/admin/products — create a DRAFT product (unpublished, zero stock).
 * Slug is generated from the name when absent; duplicate SKUs are a 409.
 */
export const POST = withApi(
  { requirePermission: "catalog.write" },
  async ({ request, identity, meta }) => {
    const body = createSchema.parse(await request.json());

    const result = await adminCreateProduct(body);
    if (!result.ok) {
      if (result.failure.code === "conflict") {
        return fail(409, ErrorCode.CONFLICT, result.failure.message);
      }
      return fail(422, ErrorCode.VALIDATION_FAILED, result.failure.message, {
        fields: { [result.failure.message.includes("brand") ? "brandId" : "categoryId"]: result.failure.message },
      });
    }

    await logAudit({
      actorType: "admin",
      actorId: identity!.user.id,
      actorLabel: identity!.user.displayName,
      action: "product.create",
      targetType: "prd",
      targetId: result.data.id,
      detail: `Created draft product "${body.name}" (${body.sku})`,
      after: { name: body.name, sku: body.sku, priceCents: body.priceCents, slug: result.data.slug },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return created({ id: result.data.id, slug: result.data.slug });
  }
);
