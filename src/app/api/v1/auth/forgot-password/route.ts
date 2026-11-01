import { z } from "zod";
import { withApi, ok } from "@/server/api/guard";
import { findUserByEmail, createPasswordResetOtp } from "@/server/repos/users";
import { enqueue } from "@/server/jobs";
import { logAudit } from "@/server/audit";
import { APP_ENV } from "@/server/env";

const bodySchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

export const POST = withApi(
  { rateLimit: { limit: 5, windowMs: 60 * 60 * 1000, key: "auth:forgot" } },
  async ({ request, meta }) => {
    const body = bodySchema.parse(await request.json());

    // Uniform response regardless of account existence (anti-enumeration).
    let devCode: string | undefined;
    const user = await findUserByEmail(body.email);
    if (user) {
      const otp = await createPasswordResetOtp(user.id);
      if (otp.ok) {
        await enqueue("email.send", {
          to: user.email,
          subject: "Your TereaCOD password reset code",
          text: [
            "Your password reset code is:",
            "",
            otp.code,
            "",
            "It expires in 1 hour, can be used once, and locks after 5 wrong tries.",
          ].join("\n"),
        });
        await logAudit({
          actorType: "customer",
          actorId: user.id,
          actorLabel: user.email,
          action: "auth.password_reset_requested",
          targetType: "user",
          targetId: user.id,
          detail: "Reset code requested",
          ip: meta.ip,
        });
        // Local development convenience ONLY: expose the code so the reset
        // flow is testable without an email provider. Preview/production do
        // not get it — a leaked code there is a password-takeover vector.
        if (APP_ENV === "development") devCode = otp.code;
      }
    }

    return ok({
      message: "If an account exists for this email, a 6-digit reset code is on its way.",
      ...(devCode ? { devCode } : {}),
    });
  }
);
