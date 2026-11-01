import { z } from "zod";
import { withApi, ok } from "@/server/api/guard";
import { getPreferences, updatePreferences } from "@/server/repos/users";
import type { PreferencePatch } from "@/server/repos/users";

export const GET = withApi({ requireAuth: true }, async ({ identity }) => {
  return ok(await getPreferences(identity!.user.id));
});

const patchSchema = z.object({
  language: z.string().max(12).optional(),
  communications: z
    .object({
      productUpdates: z.boolean().optional(),
      orderUpdates: z.boolean().optional(),
      researchInvites: z.boolean().optional(),
    })
    .optional(),
  privacy: z
    .object({
      personalization: z.boolean().optional(),
      analytics: z.boolean().optional(),
    })
    .optional(),
  accessibility: z.object({ reducedMotion: z.boolean().optional() }).optional(),
});

export const PATCH = withApi({ requireAuth: true }, async ({ request, identity }) => {
  const body: PreferencePatch = patchSchema.parse(await request.json());
  const next = await updatePreferences(identity!.user.id, body);
  return ok(next);
});
