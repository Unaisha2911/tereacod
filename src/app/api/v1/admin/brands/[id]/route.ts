import { z } from "zod";
import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { adminUpdateBrand, adminDeleteBrand } from "@/server/repos/catalog";
import { logAudit } from "@/server/audit";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  tagline: z.string().trim().min(1).max(200).optional(),
  blurb: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  origin: z.string().trim().max(80).optional(),
  established: z.string().trim().max(20).optional(),
  accent: z.enum(["violet", "ice", "magenta"]).optional(),
  featured: z.boolean().optional(),
});

/** PATCH /api/v1/admin/brands/:id — column updates (name uniqueness enforced). */
export const PATCH = withApi(
  { requirePermission: "catalog.write" },
  async ({ request, params, identity, meta }) => {
    const body = patchSchema.parse(await request.json());

    const result = await adminUpdateBrand(params.id, body);
    if (!result.ok) {
      if (result.failure.code === "not_found") return fail(404, ErrorCode.NOT_FOUND, result.failure.message);
      return fail(409, ErrorCode.CONFLICT, result.failure.message);
    }

    await logAudit({
      actorType: "admin",
      actorId: identity!.user.id,
      actorLabel: identity!.user.displayName,
      action: "brand.update",
      targetType: "brd",
      targetId: params.id,
      detail: "Updated brand",
      after: body,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  }
);

/** DELETE /api/v1/admin/brands/:id — 409 while products still reference it. */
export const DELETE = withApi(
  { requirePermission: "catalog.write" },
  async ({ params, identity, meta }) => {
    const result = await adminDeleteBrand(params.id);
    if (!result.ok) {
      if (result.failure.code === "not_found") return fail(404, ErrorCode.NOT_FOUND, result.failure.message);
      return fail(409, ErrorCode.CONFLICT, result.failure.message);
    }

    await logAudit({
      actorType: "admin",
      actorId: identity!.user.id,
      actorLabel: identity!.user.displayName,
      action: "brand.delete",
      targetType: "brd",
      targetId: params.id,
      severity: "warning",
      detail: "Deleted brand",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  }
);
