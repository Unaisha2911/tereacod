import { NextResponse, type NextRequest } from "next/server";

/**
 * TereaCOD — proxy gate for authenticated surfaces (Next 16 convention:
 * src/proxy.ts replaces the deprecated middleware.ts naming).
 *
 * Two jobs, in order:
 *  1. Unified console entry: /admin/* is a normal (unlisted) URL. Anonymous
 *     visitors are redirected to the shared /account/sign-in form — the one
 *     login for customers and staff alike. Real session/RBAC validation
 *     still happens server-side in the admin layout — this is layer one.
 *  2. Cookie-presence check for /account: it returns a hard 307 before any
 *     streaming starts, which keeps protected routes out of caches and
 *     preserves correct status codes even when a Suspense boundary (e.g.
 *     the (site) loading skeleton) would otherwise soften an in-page
 *     redirect into a 200.
 *
 * Proxy modules cannot import src/server/env.ts (node deps), so the cookie
 * name is derived here. This MUST stay in sync with SESSION_COOKIE there —
 * if you change one, change both.
 */

const PUBLIC_ACCOUNT_PATHS = new Set([
  "/account/sign-in",
  "/account/register",
  "/account/forgot-password",
  "/account/reset-password",
]);

function sessionCookieName(): string {
  return process.env.APP_ENV === "production" ? "__Host-session" : "tereacod_session";
}

export function proxy(request: NextRequest) {
  if (request.cookies.has(sessionCookieName())) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const signIn = request.nextUrl.clone();
  signIn.pathname = "/account/sign-in";
  signIn.search = `?next=${encodeURIComponent(pathname)}`;

  // Console: anonymous visitors go to the unified sign-in (staff RBAC is
  // enforced server-side by the admin layout after the session resolves).
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.redirect(signIn);
  }

  // Account area gate (unchanged behaviour).
  if (pathname === "/account" || (pathname.startsWith("/account/") && !PUBLIC_ACCOUNT_PATHS.has(pathname))) {
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
