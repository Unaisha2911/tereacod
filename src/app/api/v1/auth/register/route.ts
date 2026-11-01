import { z } from "zod";
import { withApi, ok, fail, ErrorCode, created } from "@/server/api/guard";
import { registerUser } from "@/server/repos/users";
import { verifyTurnstile } from "@/server/turnstile";
import { logAudit } from "@/server/audit";
import { PASSWORD_HINT, passwordSchema } from "@/lib/validation";

const bodySchema = z.object({
  email: z.string().email("Enter a valid email address."),
  // Same policy as the client form — one source of truth (lib/validation).
  password: passwordSchema.max(128, PASSWORD_HINT),
  displayName: z.string().trim().min(2, "Enter your name.").max(80),
  phone: z.string().trim().max(24).optional(),
  marketingOptIn: z.boolean().optional(),
  // Stored into user_preferences at creation — the checkbox on the form
  // must not silently discard the visitor's choice.
  researchInvites: z.boolean().optional(),
  turnstileToken: z.string().optional(),
});

/**
 * Registration is intentionally simple: email + password + name creates an
 * ACTIVE, verified account in one step. No email OTP, no age gate, no
 * verification screens — the response signs nothing up for follow-up flows.
 */
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
      marketingOptIn: body.marketingOptIn,
      researchInvites: body.researchInvites,
    });

    if (!result.ok) {
      return fail(409, ErrorCode.CONFLICT, "An account with this email already exists.", {
        fields: { email: "This email is already registered." },
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

    return created({ email: body.email });
  }
);
