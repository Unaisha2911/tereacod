import { z } from "zod";
import { NextResponse } from "next/server";
import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { authenticate } from "@/server/repos/users";
import { createSession } from "@/server/session";
import { setSessionCookie, readCartToken, clearCartCookie } from "@/server/api/http";
import { mergeGuestCart } from "@/server/repos/cart";
import { verifyTurnstile } from "@/server/turnstile";
import { logAudit } from "@/server/audit";
import { getUserPermissionSet } from "@/server/rbac";

const bodySchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  turnstileToken: z.string().optional(),
});

export const POST = withApi(
  { rateLimit: { limit: 10, windowMs: 15 * 60 * 1000, key: "auth:sign-in" } },
  async ({ request, meta }) => {
    const body = bodySchema.parse(await request.json());

    const bot = await verifyTurnstile(body.turnstileToken, meta.ip ?? undefined);
    if (!bot) {
      return fail(400, ErrorCode.VALIDATION_FAILED, "Captcha verification failed. Please try again.");
    }

    const result = await authenticate(body.email, body.password);
    if (!result.ok) {
      await logAudit({
        actorType: "customer",
        actorLabel: body.email,
        action: "auth.sign_in_failed",
        targetType: "user",
        targetId: body.email,
        severity: "warning",
        detail: result.reason === "suspended" ? "Suspended account sign-in attempt" : "Invalid credentials",
        ip: meta.ip,
      });
      // Distinct message for suspended accounts (password was verified —
      // telling them to contact support ends the futile retry loop). This
      // only fires after a CORRECT password, so it does not enable
      // account enumeration.
      if (result.reason === "suspended") {
        return fail(403, ErrorCode.FORBIDDEN, "This account is suspended — contact support for help.");
      }
      return fail(401, ErrorCode.UNAUTHORIZED, "Email or password is incorrect.");
    }

    const { token } = await createSession(result.user.id, {
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    // Attach + merge the guest cart (if any) into the user's active cart.
    const guestToken = await readCartToken(request);
    if (guestToken) {
      await mergeGuestCart(guestToken, result.user.id);
    }

    await logAudit({
      actorType: "customer",
      actorId: result.user.id,
      actorLabel: result.user.display_name,
      action: "auth.sign_in",
      targetType: "user",
      targetId: result.user.id,
      detail: "Signed in",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const roles = await getUserPermissionSet(result.user.id);
    const staff = roles.roles.length > 0;
    const response = NextResponse.json({
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          displayName: result.user.display_name,
          isStaff: staff,
        },
      },
    });
    await setSessionCookie(response, token);
    if (guestToken) clearCartCookie(response);
    return response;
  }
);
