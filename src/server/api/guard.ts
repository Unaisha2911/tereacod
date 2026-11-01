/**
 * TereaCOD — route-handler guard.
 *
 * withApi() wraps every /api/v1 handler with:
 *  • request id + structured error envelope (zod issues → 422 field map)
 *  • same-origin enforcement on mutating verbs (CSRF layer 1)
 *  • rate limiting per route class
 *  • session resolution + RBAC permission checks (requirePermission)
 *
 * Handlers stay thin: validate → repo → respond.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorCode, fail, ok, created, CDN_CACHE, type Meta } from "@/server/api/envelope";
import { getCurrentIdentity, requestMeta, type RequestIdentity } from "@/server/auth-context";
import { hasPermission, type PermissionSlug } from "@/server/rbac";
import { rateLimit } from "@/server/ratelimit";
import { maybeSweep } from "@/server/maintenance";

/** Route handlers parse bodies into memory — cap the default at 256 KB. */
const DEFAULT_BODY_LIMIT_BYTES = 256 * 1024;

type Handler = (ctx: ApiContext) => Promise<NextResponse>;

export interface ApiContext {
  request: Request;
  params: Record<string, string>;
  identity: RequestIdentity | null;
  requestId: string;
  meta: { ip: string | null; userAgent: string | null };
}

interface WithApiOptions {
  /** Rate limit: max requests per window for this route class. */
  rateLimit?: { limit: number; windowMs: number; key?: string };
  /** Require a session (any authenticated user). */
  requireAuth?: boolean;
  /** Require a specific permission (implies staff session). */
  requirePermission?: PermissionSlug;
  /** Override the default mutating-request body cap (bytes). */
  bodyLimit?: number;
}

export function withApi(options: WithApiOptions, handler: Handler) {
  return async (request: Request, context?: { params?: Promise<Record<string, string>> }): Promise<NextResponse> => {
    const requestId = `req_${crypto.randomUUID().slice(0, 12)}`;
    // Lazy maintenance sweep (expired sessions/tokens/carts, stuck jobs) —
    // throttled internally to ~once per hour.
    void maybeSweep().catch(() => undefined);
    try {
      const mutating = !["GET", "HEAD", "OPTIONS"].includes(request.method);

      // CSRF layer 1: same-origin enforcement on mutations.
      if (mutating) {
        const origin = request.headers.get("origin");
        if (origin) {
          const originHost = new URL(origin).host;
          const host = request.headers.get("host");
          if (!host || originHost !== host) {
            return fail(403, ErrorCode.FORBIDDEN, "Cross-origin request rejected.", { requestId });
          }
        } else if (request.headers.get("sec-fetch-site") === "cross-site") {
          // Browsers that omit Origin still declare the request site.
          return fail(403, ErrorCode.FORBIDDEN, "Cross-origin request rejected.", { requestId });
        }
      }

      // Payload guard: reject oversized bodies before they are parsed.
      if (mutating) {
        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > (options.bodyLimit ?? DEFAULT_BODY_LIMIT_BYTES)) {
          return fail(413, ErrorCode.VALIDATION_FAILED, "Request payload is too large.", { requestId });
        }
      }

      // Rate limiting.
      if (options.rateLimit) {
        const meta0 = await requestMeta();
        const key = options.rateLimit.key ?? new URL(request.url).pathname;
        const rl = rateLimit(`${key}:${meta0.ip ?? "anon"}`, options.rateLimit.limit, options.rateLimit.windowMs);
        if (!rl.allowed) {
          return fail(429, ErrorCode.RATE_LIMITED, "Too many requests — please slow down.", {
            requestId,
            headers: { "Retry-After": String(rl.retryAfterSeconds) },
          });
        }
      }

      const identity = await getCurrentIdentity();

      if (options.requireAuth && !identity) {
        return fail(401, ErrorCode.UNAUTHORIZED, "Sign in to continue.", { requestId });
      }
      if (options.requirePermission) {
        if (!identity) {
          return fail(401, ErrorCode.UNAUTHORIZED, "Sign in to continue.", { requestId });
        }
        if (!hasPermission(identity.roles, options.requirePermission)) {
          return fail(403, ErrorCode.FORBIDDEN, "You do not have access to this action.", { requestId });
        }
      }

      const params = (await context?.params) ?? {};
      const meta = await requestMeta();

      const response = await handler({ request, params, identity, requestId, meta });

      if (mutating) {
        response.headers.set("Cache-Control", "no-store");
      } else if (!response.headers.has("Cache-Control")) {
        // Per-user GETs (session, cart, saved, account, admin) must never be
        // heuristically cached by browsers/CDNs. Public reference endpoints
        // opt out by setting CDN_CACHE.* explicitly in the handler.
        response.headers.set("Cache-Control", "private, no-store");
      }
      response.headers.set("X-Request-Id", requestId);
      return response;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of error.issues) {
          const path = issue.path.join(".") || "form";
          if (!fields[path]) fields[path] = issue.message;
        }
        return fail(422, ErrorCode.VALIDATION_FAILED, "Some fields need attention.", {
          fields,
          requestId,
        });
      }
      // `await request.json()` on a malformed body throws SyntaxError — a
      // client mistake, not a server fault. 400 beats a logged 500.
      if (error instanceof SyntaxError) {
        return fail(400, ErrorCode.VALIDATION_FAILED, "The request body is not valid JSON.", { requestId });
      }
      console.error(`[api] ${request.method} ${new URL(request.url).pathname} failed:`, error);
      return fail(500, ErrorCode.INTERNAL, "Something went wrong on our side.", { requestId });
    }
  };
}

export { ok, fail, created, ErrorCode, CDN_CACHE };
export type { Meta };
