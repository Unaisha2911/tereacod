import { z } from "zod";
import { withApi, ok, fail, ErrorCode, created } from "@/server/api/guard";
import { registerUser, createEmailVerificationOtp } from "@/server/repos/users";
import { verifyTurnstile } from "@/server/turnstile";
import { enqueue } from "@/server/jobs";
import { logAudit } from "@/server/audit";
import { APP_ENV } from "@/server/env";
import { PASSWORD_HINT, passwordSchema } from "@/lib/validation";

const bodySchema = z.object({
  email: z.string().email("Enter a valid email address."),
  // Same policy as the client form — one source of truth (lib/validation).
  password: passwordSchema.max(128, PASSWORD_HINT),
  displayName: z.string().trim().min(2, "Enter your name.").max(80),
  phone: z.string().trim().max(24).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").optional(),
  marketingOptIn: z.boolean().optional(),
  turnstileToken: z.string().optional(),
});

export const POST = withApi(
  { rateLimit: { limit: 10, windowMs: 60 * 60 * 1000, key: "auth:register" } },
  async ({ request, meta }) => {
    const body = bodySchema.parse(await request.json());

    const bot = await verifyTurnstile(body.turnstileToken, meta.ip ?? undefined);
    if (!bot) {
      return fail(400, ErrorCode.VALIDATION_FAILED, "Captcha verification failed. Please try again.");
    }

    const result = await registerUser({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      phone: body.phone,
      dateOfBirth: body.dateOfBirth,
      marketingOptIn: body.marketingOptIn,
    });

    if (!result.ok) {
      return fail(409, ErrorCode.CONFLICT, "An account with this email already exists.", {
        fields: { email: "This email is already registered." },
      });
    }

    // Signup stays simple (email + password); security comes from the
    // 6-digit email OTP that must be confirmed before the account counts
    // as verified. Cooldown cannot trip on a fresh registration (no rows).
    const otp = await createEmailVerificationOtp(result.userId);
    if (otp.ok) {
      await enqueue("email.send", {
        to: body.email,
        subject: "Verify your TereaCOD account",
        text: [
          `Welcome to TereaCOD, ${body.displayName}!`,
          "",
          `Your verification code is: ${otp.code}`,
          "",
          "It expires in 15 minutes and can be used once.",
          `Prefer a link? https://tereacod.ae/account/verify-email?email=${encodeURIComponent(body.email)}&code=${otp.code}`,
        ].join("\n"),
      });
    }
    await logAudit({
      actorType: "customer",
      actorId: result.userId,
      actorLabel: body.displayName,
      action: "auth.register",
      targetType: "user",
      targetId: result.userId,
      detail: "Account registered",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    // Local development convenience ONLY: expose the OTP so the flow is
    // testable without an email provider (same pattern as forgot-password).
    return created({
      email: body.email,
      verificationRequired: true,
      ...(APP_ENV === "development" && otp.ok ? { devCode: otp.code } : {}),
    });
  }
);
