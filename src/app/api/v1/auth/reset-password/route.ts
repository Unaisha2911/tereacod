import { z } from "zod";
import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { consumePasswordResetOtp } from "@/server/repos/users";
import { revokeAllSessionsForUser } from "@/server/session";
import { logAudit } from "@/server/audit";
import { PASSWORD_HINT, passwordSchema } from "@/lib/validation";

const bodySchema = z.object({
  email: z.string().email("Enter a valid email address."),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from the email."),
  // Same policy as the client form — one source of truth (lib/validation).
  password: passwordSchema.max(128, PASSWORD_HINT),
});

export const POST = withApi(
  { rateLimit: { limit: 10, windowMs: 60 * 60 * 1000, key: "auth:reset" } },
  async ({ request, meta }) => {
    const body = bodySchema.parse(await request.json());
    const result = await consumePasswordResetOtp(body.email, body.code, body.password);
    if (result.status !== "ok") {
      const message =
        result.status === "locked"
          ? "Too many wrong attempts. Request a fresh reset code and try again."
          : "That code is incorrect or has expired.";
      return fail(400, ErrorCode.VALIDATION_FAILED, message, {
        fields: { code: message },
      });
    }

    // Password changed — every existing session is dead. The attacker (and
    // the owner's other devices) must sign in again with the new secret.
    await revokeAllSessionsForUser(result.userId);
    await logAudit({
      actorType: "customer",
      actorId: result.userId,
      actorLabel: body.email,
      action: "auth.password_reset",
      targetType: "user",
      targetId: result.userId,
      detail: "Password reset completed via OTP; all sessions revoked",
      severity: "warning",
      ip: meta.ip,
    });
    return ok({ ok: true });
  }
);
