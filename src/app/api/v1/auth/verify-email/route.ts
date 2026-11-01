import { z } from "zod";
import { NextResponse } from "next/server";
import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import {
  consumeEmailVerificationOtp,
  createEmailVerificationOtp,
  findUserByEmail,
} from "@/server/repos/users";
import { enqueue } from "@/server/jobs";
import { logAudit } from "@/server/audit";
import { APP_ENV } from "@/server/env";

const bodySchema = z.object({
  email: z.string().email("Enter a valid email address."),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code.").optional(),
});

/**
 * POST /auth/verify-email
 *  • { email, code } — confirm a 6-digit OTP (single-use, 5 attempts max).
 *  • { email }       — resend a fresh code (60s cooldown server-side).
 */
export const POST = withApi(
  // Both paths can trigger real emails — must never be an open relay.
  { rateLimit: { limit: 8, windowMs: 15 * 60 * 1000, key: "auth:verify-email" } },
  async ({ request, meta }) => {
    const body = bodySchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    if (body.code) {
      const user = await findUserByEmail(email);
      const result = await consumeEmailVerificationOtp(email, body.code);
      if (result === "invalid") {
        return fail(400, ErrorCode.VALIDATION_FAILED, "That code is incorrect or has expired.", {
          fields: { code: "Incorrect or expired code." },
        });
      }
      if (result === "locked") {
        return fail(429, ErrorCode.RATE_LIMITED, "Too many wrong attempts. Request a fresh code and try again.", {
          fields: { code: "Locked after too many attempts — request a new code." },
        });
      }

      await logAudit({
        actorType: "customer",
        actorId: user?.id,
        actorLabel: email,
        action: "auth.email_verified",
        targetType: "user",
        targetId: user?.id ?? email,
        detail: "Email verified via OTP",
        ip: meta.ip,
      });
      return ok({ verified: true });
    }

    // Resend path.
    const user = await findUserByEmail(email);
    let devCode: string | undefined;
    if (user && !user.email_verified_at) {
      const otp = await createEmailVerificationOtp(user.id);
      if (!otp.ok) {
        return fail(429, ErrorCode.RATE_LIMITED, "A code was just sent. Wait a minute before requesting another.");
      }
      await enqueue("email.send", {
        to: user.email,
        subject: "Your TereaCOD verification code",
        text: `Your verification code is: ${otp.code}\n\nIt expires in 15 minutes and can be used once.`,
      });
      if (APP_ENV === "development") devCode = otp.code;
    }
    // Uniform response whether or not the account exists / is verified —
    // no account enumeration through the resend path.
    return NextResponse.json({
      data: { sent: true, ...(devCode ? { devCode } : {}) },
    });
  }
);
