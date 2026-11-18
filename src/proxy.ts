import { NextResponse, type NextRequest } from "next/server";

/**
 * TereaCOD — proxy gate (Next 16 convention: src/proxy.ts replaces the
 * deprecated middleware.ts naming).
 *
 * Three jobs, in order:
 *  1. ANONYMOUS HTML EDGE CACHE — repeat page views for signed-out visitors
 *     are answered from the Workers Cache API (~1-2 ms, zero SSR CPU).
 *     Every page is rendered with `force-dynamic` (see (site)/layout.tsx
 *     for why), so each SSR pass burns real CPU — and this deployment runs
 *     on the Workers FREE plan whose per-request CPU budget is ~10 ms,
 *     which bursty React renders intermittently exceed and Cloudflare then
 *     reports as error 1102 ("Worker exceeded resource limits"). Serving
 *     cached HTML for anonymous traffic removes the per-view SSR cost
 *     entirely: only the first request per URL per TTL per colo renders.
 *     Safety rails:
 *       • authenticated visitors (session cookie present) bypass the cache
 *         completely and always get live SSR;
 *       • only 200 + text/html responses without Set-Cookie are stored;
 *       • TTL is 60 s — admin edits/maintenance flag converge no slower
 *         than the existing catalog/product data TTLs already do;
 *       • the fill fetch carries an internal header so it can never
 *         recurse into the cache layer itself;
 *       • everything is best-effort: no Cache API (bun dev) or no
 *         execution context simply means every request renders live.
 *  2. Unified console entry: /admin/* is a normal (unlisted) URL. Anonymous
 *     visitors are redirected to the shared /account/sign-in form — the one
 *     login for customers and staff alike. Real session/RBAC validation
 *     still happens server-side in the admin layout — this is layer one.
 *  3. Cookie-presence check for /account: it returns a hard 307 before any
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

/** Fill requests announce themselves so the cache layer never self-recurses. */
const FILL_HEADER = "x-terea-html-cache-fill";
/** Anonymous HTML freshness window (seconds). */
const HTML_TTL_S = 60;
/** Responses above this are never stored (protects isolate memory). */
const MAX_CACHED_HTML_BYTES = 2 * 1024 * 1024;
/** Marketing/tracking params dropped from the cache key to raise hit rate. */
const STRIPPED_PARAMS = /^(utm_|fbclid$|gclid$|msclkid$|mc_cid$|mc_eid$)/;

function sessionCookieName(): string {
  return process.env.APP_ENV === "production" ? "__Host-session" : "tereacod_session";
}

interface EdgeCacheLike {
  match: (request: RequestInfo) => Promise<Response | undefined>;
  put: (request: RequestInfo, response: Response) => Promise<void>;
}

/** The colo-wide cache, or null outside Workers (bun dev / Node standalone). */
function edgeCache(): EdgeCacheLike | null {
  try {
    return (globalThis as unknown as { caches?: { default?: EdgeCacheLike } }).caches?.default ?? null;
  } catch {
    return null;
  }
}

/**
 * A cacheable anonymous page navigation: GET, browser HTML accept, not an
 * RSC/prefetch router request, not a protected console/account path, and
 * not shaped like a static file (those are served by the assets layer /
 * filesystem before this gate ever sees them).
 */
function isCacheablePage(request: NextRequest): boolean {
  if (request.method !== "GET") return false;
  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/html")) return false;
  if (request.headers.has("rsc") || request.headers.has("next-router-prefetch")) return false;
  const { pathname } = request.nextUrl;
  if (
    pathname === "/admin" || pathname.startsWith("/admin/") ||
    pathname === "/account" || pathname.startsWith("/account/") ||
    pathname.startsWith("/cdn-cgi/")
  ) {
    return false;
  }
  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  if (lastSegment.includes(".")) return false; // favicon.ico, manifest, robots.txt, …
  return true;
}

/** Cache key: request URL with tracking params stripped (same page content). */
function cacheKeyUrl(request: NextRequest): string {
  const url = new URL(request.nextUrl.toString());
  const params = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (!STRIPPED_PARAMS.test(key)) params.set(key, value);
  }
  url.search = params.toString() ? `?${params.toString()}` : "";
  return url.toString();
}

/** Run `fn` in the background where the platform allows (Workers waitUntil). */
function runInBackground(fn: () => Promise<void>): void {
  void (async () => {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      getCloudflareContext().ctx.waitUntil(fn());
    } catch {
      // No execution context (bun dev) — the fill is skipped; every request
      // simply renders live, exactly like the pre-cache behaviour.
    }
  })();
}

/**
 * Self-fetch the page once, store the HTML in the colo cache under the
 * canonical key. Guards: only 200 + text/html, no Set-Cookie, body within
 * the byte cap. The request carries FILL_HEADER so the inner pass never
 * re-enters this layer (no recursion).
 *
 * WHY THERE IS NO CACHE-CONTROL GUARD ON THE INNER RESPONSE: Next.js
 * stamps every force-dynamic page with `private, no-cache, no-store,
 * max-age=0, must-revalidate`. The original guard treated that boilerplate
 * header as a cache opt-out — which meant EVERY fill self-fetched a full
 * render and then discarded it: the cache never populated, every anonymous
 * page view rendered TWICE (once live, once for the discarded fill), and
 * the doubled CPU/D1 load spiralled into the intermittent 500s (React
 * #441 server-render errors + sustained resource exhaustion). Cacheability
 * for anonymous HTML is decided HERE (isCacheablePage + the signed-in
 * cookie check), not by the header Next.js puts on dynamic pages — the
 * stored entry is re-stamped `public, max-age=${HTML_TTL_S}` below.
 */
async function fillHtmlCache(url: string): Promise<void> {
  const cache = edgeCache();
  if (!cache) return;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { accept: "text/html", [FILL_HEADER]: "1" },
    });
    if (response.status !== 200) return;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return;
    if (response.headers.has("set-cookie")) return;
    const body = await response.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_CACHED_HTML_BYTES) return;
    const stored = new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": `public, max-age=${HTML_TTL_S}`,
        "x-terea-html-cache": "fill",
      },
    });
    await cache.put(url, stored);
  } catch {
    // Best-effort — a failed fill just means the next visitor renders live.
  }
}

/**
 * ONE fill per key per isolate: a burst of simultaneous misses of the same
 * URL (the exact shape of a cold colo after deploy, or one URL shared on
 * social) used to spawn N self-fetch renders — doubling SSR CPU exactly
 * when the isolate is cold and most fragile. Concurrent misses now share
 * the single in-flight fill; the first one to finish populates the cache
 * and everyone else simply renders their live response as before.
 *
 * Returns the in-flight fill promise so callers can hand the REAL promise
 * to waitUntil — the Worker must stay alive until the fill finishes, not
 * until the current response does (a floating void would let the runtime
 * reap the fill mid-write).
 */
const fills = new Map<string, Promise<void>>();

function fillOnce(key: string): Promise<void> {
  let fill = fills.get(key);
  if (!fill) {
    fill = fillHtmlCache(key).finally(() => {
      fills.delete(key);
    });
    fills.set(key, fill);
  }
  return fill;
}

/** Existing auth-surface gate, unchanged. */
function gate(request: NextRequest): NextResponse {
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

export async function proxy(request: NextRequest) {
  // Signed-in visitors always get live, personalised SSR — never cached HTML.
  if (request.cookies.has(sessionCookieName())) {
    return NextResponse.next();
  }

  // Recursion guard: the cache fill's own pass renders live.
  if (request.headers.has(FILL_HEADER)) {
    return gate(request);
  }

  if (isCacheablePage(request)) {
    const cache = edgeCache();
    if (cache) {
      const key = cacheKeyUrl(request);
      try {
        const hit = await cache.match(key);
        if (hit) {
          // Edge hit — no SSR, no D1/KV traffic: the 1102-safe fast path.
          return hit;
        }
      } catch {
        // Cache read failure — render live below.
      }
      // Miss: render for this visitor AND store the HTML for the next one
      // (at most one fill per key runs at a time).
      runInBackground(() => fillOnce(key));
    }
  }

  return gate(request);
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals and the legacy /uploads
    // media path (rewritten into /api — see next.config.ts rewrites).
    "/((?!api|_next|uploads).*)",
  ],
};
