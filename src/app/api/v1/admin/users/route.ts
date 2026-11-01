import { z } from "zod";
import { withApi, ok, fail, created, ErrorCode } from "@/server/api/guard";
import { listStaff, adminRoles, adminCreateUser } from "@/server/repos/admin";

/** GET /api/v1/admin/users — live staff roster + role catalog. */
export const GET = withApi({ requirePermission: "staff.manage" }, async () => {
  const [staff, roles] = await Promise.all([listStaff(), adminRoles()]);
  return ok({ staff, roles });
});

const createSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    displayName: z.string().trim().min(2, "Display name is too short.").max(80),
    password: z.string().min(8, "Passwords must be at least 8 characters.").max(128).optional(),
    roleSlug: z.string().trim().max(60).optional(),
    kind: z.enum(["staff", "customer"]),
  })
  .refine((body) => body.kind !== "staff" || Boolean(body.roleSlug), {
    message: "Choose a role for staff accounts.",
    path: ["roleSlug"],
  });

/** POST /api/v1/admin/users — create a staff or customer account. */
export const POST = withApi(
  { requirePermission: "staff.manage" },
  async ({ request, identity }) => {
    const body = createSchema.parse(await request.json());

    const result = await adminCreateUser({
      email: body.email,
      displayName: body.displayName,
      password: body.password,
      roleSlug: body.kind === "staff" ? body.roleSlug : undefined,
      kind: body.kind,
      actor: { id: identity!.user.id, label: identity!.user.displayName },
    });

    if (!result.ok) {
      if (result.reason === "email_taken") {
        return fail(409, ErrorCode.CONFLICT, "An account with this email already exists.");
      }
      return fail(422, ErrorCode.VALIDATION_FAILED, "That role does not exist.", {
        fields: { roleSlug: "Unknown role." },
      });
    }

    return created({
      id: result.id,
      email: result.email,
      ...(result.tempPassword ? { tempPassword: result.tempPassword } : {}),
    });
  }
);
