import { z } from "zod";
import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { adminUpdateCategory, adminDeleteCategory } from "@/server/repos/catalog";
import { logAudit } from "@/server/audit";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(300).optional(),
  longDescription: z.string().trim().max(2000).nullable().optional(),
  accent: z.enum(["violet", "ice", "magenta"]).optional(),
  featured: z.boolean().optional(),
});

/** PATCH /api/v1/admin/categories/:id — column updates. */
export const PATCH = withApi(
  { requirePermission: "catalog.write" },
  async ({ request, params, identity, meta }) => {
    const body = patchSchema.parse(await request.json());

    const result = await adminUpdateCategory(params.id, body);
    if (!result.ok) {
      if (result.failure.code === "not_found") return fail(404, ErrorCode.NOT_FOUND, result.failure.message);
      return fail(409, ErrorCode.CONFLICT, result.failure.message);
    }

    await logAudit({
      actorType: "admin",
      actorId: identity!.user.id,
      actorLabel: identity!.user.displayName,
      action: "category.update",
      targetType: "cat",
      targetId: params.id,
      detail: "Updated category",
      after: body,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  }
);

/** DELETE /api/v1/admin/categories/:id — 409 while products still reference it. */
export const DELETE = withApi(
  { requirePermission: "catalog.write" },
  async ({ params, identity, meta }) => {
    const result = await adminDeleteCategory(params.id);
    if (!result.ok) {
      if (result.failure.code === "not_found") return fail(404, ErrorCode.NOT_FOUND, result.failure.message);
      return fail(409, ErrorCode.CONFLICT, result.failure.message);
    }

    await logAudit({
      actorType: "admin",
      actorId: identity!.user.id,
      actorLabel: identity!.user.displayName,
      action: "category.delete",
      targetType: "cat",
      targetId: params.id,
      severity: "warning",
      detail: "Deleted category",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  }
);
