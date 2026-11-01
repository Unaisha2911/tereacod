import { z } from "zod";
import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { softDeleteMedia } from "@/server/repos/media";
import { getDb } from "@/server/db/client";
import { logAudit } from "@/server/audit";

const patchSchema = z.object({
  alt: z.string().max(200, "Alt text must be 200 characters or fewer."),
});

/** PATCH /api/v1/admin/media/:id — alt-text metadata write (media.write). */
export const PATCH = withApi(
  { requirePermission: "media.write" },
  async ({ request, params, identity, meta }) => {
    const body = patchSchema.parse(await request.json());
    const alt = body.alt.trim() === "" ? null : body.alt.trim();
    const result = await (await getDb()).run(`UPDATE media_assets SET alt = ? WHERE id = ? AND deleted_at IS NULL`, [
      alt,
      params.id,
    ]);
    if (result.changes === 0) return fail(404, ErrorCode.NOT_FOUND, "No media asset found.");
    await logAudit({
      actorType: "admin",
      actorId: identity!.user.id,
      actorLabel: identity!.user.displayName,
      action: "media.write",
      targetType: "media",
      targetId: params.id,
      detail: alt ? `Alt text updated ("${alt.slice(0, 80)}")` : "Alt text cleared",
      ip: meta.ip,
    });
    return ok({ id: params.id, alt });
  }
);

export const DELETE = withApi(
  { requirePermission: "media.write" },
  async ({ params, identity, meta }) => {
    const removed = await softDeleteMedia(params.id);
    if (!removed) return fail(404, ErrorCode.NOT_FOUND, "No media asset found.");
    await logAudit({
      actorType: "admin",
      actorId: identity!.user.id,
      actorLabel: identity!.user.displayName,
      action: "media.delete",
      targetType: "media",
      targetId: params.id,
      severity: "warning",
      detail: "Media asset moved to trash",
      ip: meta.ip,
    });
    return ok({ ok: true });
  }
);
