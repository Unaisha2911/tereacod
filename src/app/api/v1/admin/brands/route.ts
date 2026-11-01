import { z } from "zod";
import { withApi, ok, fail, created, ErrorCode } from "@/server/api/guard";
import { listBrands, brandItemCounts, adminCreateBrand } from "@/server/repos/catalog";
import { logAudit } from "@/server/audit";

/** GET /api/v1/admin/brands — directory with product counts. */
export const GET = withApi({ requirePermission: "catalog.read" }, async () => {
  const [brands, counts] = await Promise.all([listBrands(), brandItemCounts()]);
  return ok({
    items: brands.map((brand) => ({ ...brand, productCount: counts[brand.slug] ?? 0 })),
    total: brands.length,
  });
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(80).optional(),
  tagline: z.string().trim().min(1).max(200).optional(),
  blurb: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  origin: z.string().trim().max(80).optional(),
  established: z.string().trim().max(20).optional(),
  accent: z.enum(["violet", "ice", "magenta"]).optional(),
  featured: z.boolean().optional(),
});

/** POST /api/v1/admin/brands — create with auto slug (unique) + defaults. */
export const POST = withApi(
  { requirePermission: "catalog.write" },
  async ({ request, identity, meta }) => {
    const body = createSchema.parse(await request.json());

    const result = await adminCreateBrand(body);
    if (!result.ok) {
      if (result.failure.code === "conflict") return fail(409, ErrorCode.CONFLICT, result.failure.message);
      return fail(422, ErrorCode.VALIDATION_FAILED, result.failure.message);
    }

    await logAudit({
      actorType: "admin",
      actorId: identity!.user.id,
      actorLabel: identity!.user.displayName,
      action: "brand.create",
      targetType: "brd",
      targetId: result.data.id,
      detail: `Created brand "${body.name}"`,
      after: { name: body.name, slug: result.data.slug },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return created({ id: result.data.id, slug: result.data.slug });
  }
);
