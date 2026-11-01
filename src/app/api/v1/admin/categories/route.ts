import { z } from "zod";
import { withApi, ok, fail, created, ErrorCode } from "@/server/api/guard";
import { listCategories, adminCreateCategory } from "@/server/repos/catalog";
import { logAudit } from "@/server/audit";

/** GET /api/v1/admin/categories — taxonomy with product counts. */
export const GET = withApi({ requirePermission: "catalog.read" }, async () => {
  const categories = await listCategories();
  return ok({ items: categories, total: categories.length });
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(300).optional(),
  longDescription: z.string().trim().min(1).max(2000).optional(),
  accent: z.enum(["violet", "ice", "magenta"]).optional(),
  featured: z.boolean().optional(),
});

/** POST /api/v1/admin/categories — create with auto slug (unique) + defaults. */
export const POST = withApi(
  { requirePermission: "catalog.write" },
  async ({ request, identity, meta }) => {
    const body = createSchema.parse(await request.json());

    const result = await adminCreateCategory(body);
    if (!result.ok) {
      return fail(422, ErrorCode.VALIDATION_FAILED, result.failure.message);
    }

    await logAudit({
      actorType: "admin",
      actorId: identity!.user.id,
      actorLabel: identity!.user.displayName,
      action: "category.create",
      targetType: "cat",
      targetId: result.data.id,
      detail: `Created category "${body.name}"`,
      after: { name: body.name, slug: result.data.slug },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return created({ id: result.data.id, slug: result.data.slug });
  }
);
