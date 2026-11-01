import { NextResponse, type NextRequest } from "next/server";

/**
 * TereaCOD — edge gate for authenticated surfaces.
 *
 * Three jobs, in order:
 *  1. The literal /admin URL is DEAD: any request to it gets a hard 404 so
 *     the console is not discoverable by guessing. The console's public
 *     surface is ADMIN_ACCESS_PATH (e.g. /manage/<secret>) which is
 *     rewritten to /admin/* here after a cookie-presence check. Edge
 *     modules cannot import src/server/env.ts (node deps), so the env var
 *     is read directly and parsed defensively.
 *  2. Cookie-presence check for /account and the console: it returns a hard
 *     307 before any streaming starts, which keeps protected routes out of
 *     caches and preserves correct status codes even when a Suspense
 *     boundary (e.g. the (site) loading skeleton) would otherwise soften an
 *     in-page redirect into a 200. Real session/RBAC validation still
 *     happens server-side in the account gate / admin layout — this is
 *     layer one.
 *  3. Nothing else is touched.
 */

const PUBLIC_ACCOUNT_PATHS = new Set([
  "/account/sign-in",
  "/account/register",
  "/account/forgot-password",
  "/account/reset-password",
  "/account/verify-email",
  "/account/verify",
]);

// Edge modules cannot import src/server/env.ts (node deps) — this MUST stay
// in sync with SESSION_COOKIE there. If you change one, change both.
function sessionCookieName(): string {
  return process.env.APP_ENV === "production" ? "__Host-session" : "tereacod_session";
}

/**
 * Parse ADMIN_ACCESS_PATH ("manage/<secret>") into its two segments.
 * Returns null when unset/malformed — the console then stays unreachable
 * (fail-closed) rather than falling back to a guessable path.
 */
function consoleSegments(): { ns: string; secret: string } | null {
  const raw = (process.env.ADMIN_ACCESS_PATH ?? "").replace(/^\/+|\/+$/g, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { ns: parts[0], secret: parts[1] };
}

function notFound(request: NextRequest): NextResponse {
  // Rewriting to a route that does not exist makes Next render the styled
  // 404 page with a real 404 status — same response as any unknown URL.
  const url = request.nextUrl.clone();
  url.pathname = "/__dead_route__";
  url.search = "";
  return NextResponse.rewrite(url);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) Kill the predictable /admin URL for everyone, always.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return notFound(request);
  }

  const segments = consoleSegments();
  const [first, second] = pathname.replace(/^\/+/, "").split("/");

  // 2) Secret console path → internal /admin route.
  if (segments && first === segments.ns) {
    // Wrong secret, wrong namespace, or no session at all: indistinguishable
    // 404. (Redirecting anonymous visitors to sign-in would turn a correct
    // guess into a detectable 307-vs-404 oracle.) Staff learn the path from
    // the account overview / post-sign-in redirect, so they arrive with a
    // live session cookie.
    if (second !== segments.secret || !request.cookies.has(sessionCookieName())) {
      return notFound(request);
    }
    const internal = request.nextUrl.clone();
    internal.pathname = pathname === `/${segments.ns}/${segments.secret}`
      ? "/admin"
      : `/admin${pathname.slice(`/${segments.ns}/${segments.secret}`.length)}`;
    return NextResponse.rewrite(internal);
  }

  // 3) Account area gate (unchanged behaviour).
  if (request.cookies.has(sessionCookieName())) {
    return NextResponse.next();
  }

  const signIn = request.nextUrl.clone();
  signIn.pathname = "/account/sign-in";
  signIn.search = `?next=${encodeURIComponent(pathname)}`;

  if (pathname === "/account" || (pathname.startsWith("/account/") && !PUBLIC_ACCOUNT_PATHS.has(pathname))) {
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}

export const config = {
  // The console namespace ("manage") must stay in sync with the first
  // segment of ADMIN_ACCESS_PATH.
  matcher: ["/account/:path*", "/admin/:path*", "/manage/:path*"],
};
