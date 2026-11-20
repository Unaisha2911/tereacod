import { NextResponse, type NextRequest } from "next/server";

/**
 * TereaCOD — proxy gate (Next 16 convention: src/proxy.ts replaces the
 * deprecated middleware.ts naming).
 *
 * Three jobs, in order:
 *  1. HTML EDGE CACHE (serve-stale-while-revalidate) — repeat page views are
 *     answered from the Workers Cache API (~1-2 ms, zero SSR CPU) for
 *     EVERYONE, signed-in visitors included. Every page is rendered with
 *     `force-dynamic` (see (site)/layout.tsx for why), so each SSR pass
 *     burns real CPU — and this deployment runs on the Workers FREE plan
 *     whose per-request CPU budget is ~10 ms, which bursty React renders
 *     intermittently exceed and Cloudflare then reports as error 1102
 *     ("Worker exceeded resource limits"). Signed-in repeat visitors were
 *     the biggest remaining 1102 source: their per-view live renders are
 *     now served from the cache instead. Serving cached HTML to signed-in
 *     visitors is safe because every cacheable page is an identity-free
 *     shell — cart badge, account menu and saved items hydrate client-side
 *     from /api/v1/bootstrap, and the identity-dependent surfaces
 *     (/account/*, /admin/*) are never cached. Freshness:
 *       • entries younger than HTML_SOFT_TTL_S (45 s) are served as-is;
 *       • older entries are served stale AND re-filled in the background
 *         (one fill per URL at a time), so the NEXT view is fresh — an
 *         admin edit surfaces on the visitor's next page view;
 *       • entries older than HTML_MAX_AGE_S (300 s) are never served —
 *         the visitor renders live and the cache refills;
 *       • only 200 + text/html responses without Set-Cookie are stored;
 *       • the fill fetch carries an internal header so it can never
 *         recurse into the cache layer itself;
 *       • everything is best-effort: no Cache API (bun dev) or no
 *         execution context simply means every request renders live.
 *  2. Unified console entry: /admin/* is a normal (unlisted) URL. Anonymous
 *     visitors are redirected to the shared /account/sign-in form — the one
 *     login for customers and staff alike. Signed-in visitors pass straight
 *     through (never gate-redirected, never cache-filled); real session/RBAC
 *     validation still happens server-side in the admin layout.
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
/**
 * SOFT freshness window (seconds): entries younger than this are served
 * as-is to every visitor. Entries OLDER than this are still served — but
 * a background re-fill starts so the NEXT view is fresh (serve-stale-
 * while-revalidate). This keeps page HTML near-live (at most one view
 * stale) while bounding SSR to roughly one render per URL per soft-TTL
 * per colo, instead of one render PER VIEW.
 */
const HTML_SOFT_TTL_S = 45;
/**
 * HARD age ceiling (seconds): entries older than this are never served —
 * the visitor renders live and the cache refills. Bounds worst-case
 * staleness (e.g. a deployside colo that stopped filling) the same way
 * the old fixed TTL did.
 */
const HTML_MAX_AGE_S = 300;
/** Responses above this are never stored (protects isolate memory). */
const MAX_CACHED_HTML_BYTES = 2 * 1024 * 1024;
/** Marketing/tracking params dropped from the cache key to raise hit rate. */
const STRIPPED_PARAMS = /^(utm_|fbclid$|gclid$|msclkid$|mc_cid$|mc_eid$)/;
/** Header stamped on stored entries with the fill epoch (ms) for age checks. */
const FILLED_AT_HEADER = "x-terea-html-cache-filled-at";

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
        "cache-control": `public, max-age=${HTML_MAX_AGE_S}`,
        "x-terea-html-cache": "fill",
        [FILLED_AT_HEADER]: String(Date.now()),
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
  const signedIn = request.cookies.has(sessionCookieName());
  const fillPass = request.headers.has(FILL_HEADER);

  /**
   * EDGE HTML CACHE — read path. Safe for EVERY visitor, signed-in included:
   * every cacheable storefront page renders an identical, identity-free
   * shell (personalisation — cart badge, account menu, saved items —
   * hydrates client-side from /api/v1/bootstrap, and the identity-dependent
   * surfaces /account/* and /admin/* are never cached). Signed-in repeat
   * visitors (30-day sliding sessions — the bulk of real customer traffic)
   * previously rendered live on EVERY view, which is exactly what pushed
   * busy views past the Workers FREE plan's ~10 ms CPU budget into error
   * 1102. Serving them the cached shell removes the per-view SSR render
   * entirely; the serve-stale-while-revalidate scheme below keeps the page
   * at most one view stale (a background re-fill starts once the entry
   * passes the soft window), so admin edits surface on the NEXT view.
   *
   * Fill passes skip the read (they ARE the render that populates it).
   */
  if (!fillPass && isCacheablePage(request)) {
    const cache = edgeCache();
    if (cache) {
      const key = cacheKeyUrl(request);
      try {
        const hit = await cache.match(key);
        if (hit) {
          const filledAt = Number(hit.headers.get(FILLED_AT_HEADER) ?? 0);
          const ageS = filledAt > 0 ? Math.max(0, (Date.now() - filledAt) / 1000) : 0;
          if (filledAt === 0 || ageS <= HTML_SOFT_TTL_S) {
            // Fresh (or legacy entry without the age stamp): serve directly.
            return hit;
          }
          if (ageS <= HTML_MAX_AGE_S) {
            // Stale-but-serviceable: serve this view, refresh behind it.
            // fillOnce dedupes concurrent refreshes for the same URL.
            runInBackground(() => fillOnce(key));
            return hit;
          }
          // Older than the hard ceiling — fall through and render live.
        }
      } catch {
        // Cache read failure — render live below.
      }
      // Miss: anonymous visitors render for this visitor AND trigger the
      // one background fill that stores the HTML for everyone else.
      // Signed-in misses never fill — their render is live-only, exactly
      // like the pre-cache behaviour (keeps a burst of signed-in traffic
      // from doubling into renders the cache would discard anyway).
      if (!signedIn) {
        runBackgroundFill(key);
      }
    }
  }

  // Signed-in visitors never pass through the anonymous gates below —
  // /admin/* must stay reachable for staff (RBAC is enforced inside the
  // admin layout) and /account/* redirects must not loop.
  if (signedIn) {
    return NextResponse.next();
  }

  // Recursion guard + anonymous gates: the fill pass and every miss render
  // live; anonymous /admin and /account visitors are redirected to sign-in.
  return gate(request);
}

/** Fire the (deduplicated) background fill for a cacheable page key. */
function runBackgroundFill(key: string): void {
  if (!edgeCache()) return;
  runInBackground(() => fillOnce(key));
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals and the legacy /uploads
    // media path (rewritten into /api — see next.config.ts rewrites).
    "/((?!api|_next|uploads).*)",
  ],
};
