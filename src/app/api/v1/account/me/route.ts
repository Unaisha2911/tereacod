import { z } from "zod";
import { withApi, ok } from "@/server/api/guard";
import { getUserById, toUserProfile, updateProfile } from "@/server/repos/users";

export const GET = withApi({ requireAuth: true }, async ({ identity }) => {
  const row = await getUserById(identity!.user.id);
  return ok(row ? toUserProfile(row) : null);
});

const patchSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(24).nullable().optional(),
});

export const PATCH = withApi({ requireAuth: true }, async ({ request, identity }) => {
  const body = patchSchema.parse(await request.json());
  await updateProfile(identity!.user.id, body);
  const row = await getUserById(identity!.user.id);
  return ok(row ? toUserProfile(row) : null);
});
