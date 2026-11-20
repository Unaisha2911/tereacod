import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  /**
   * Image optimization MUST stay off for this deployment target.
   *
   * On Cloudflare Workers (OpenNext) `/_next/image` can serve build-time
   * static assets, but its upstream self-fetch of DYNAMIC routes (the media
   * API at /api/v1/media/*) fails — a Worker cannot subrequest its own
   * hostname — and the optimizer answers 404 "upstream response is
   * invalid". Admin-uploaded product photos therefore rendered as
   * "Image unavailable" for visitors while the admin library (which
   * bypasses the optimizer) showed them fine.
   *
   * The optimizer was pass-through-only on Workers anyway (original bytes
   * were served un-re-encoded), so nothing is lost: every media URL is
   * verified to serve directly (R2 binding / media_blobs fallback /
   * static assets) and Cloudflare's CDN still caches responses.
   */
  images: { unoptimized: true },
  experimental: {
    // Tree-shake barrel imports (lucide-react is imported across many
    // islands) — smaller client bundles, faster first paint.
    optimizePackageImports: ["lucide-react", "framer-motion", "@radix-ui/react-slot"],
  },
  async rewrites() {
    return [
      {
        // Media URL compatibility — afterFiles (default) so real static
        // files in public/uploads keep winning locally, while any
        // /uploads/<key> URL without a static file (e.g. rows exported
        // from a local-era database and applied to D1) resolves through
        // the media API instead of 404ing: the route reads the same key
        // from R2 on Workers and from public/uploads in the sandbox.
        source: "/uploads/:path*",
        destination: "/api/v1/media/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        // Repo-shipped artwork (smoke textures, brand shots, demo product
        // imagery, icons). Not fingerprinted, so a short fresh window plus
        // a long stale-while-revalidate tail: repeat visits render from
        // cache instantly, and a deploy swap converges within a day
        // (Cloudflare keeps serving the old bytes while revalidating).
        source: "/:asset(smoke|brand|products|icons)/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        // Root brand files — favicon/OG art/logo. Same policy as above.
        source: "/:file(favicon.ico|og-image.jpg|apple-touch-icon.png|icon-192.png|icon-512.png|logo.svg)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        // Baseline hardening (QA audit Task 26) + Lighthouse trust & safety.
        // HSTS carries `preload` so the domain is eligible for the browser
        // preload list; CSP ships in enforcement mode with the two inline
        // allowances a Next app inherently needs (framework bootstrap +
        // styled/JSON-LD inline content) plus the Cloudflare Web Analytics
        // beacon and the Google Tag Manager container (GTM-PW9WSMBN, head
        // of the root layout) with the Google Analytics collect endpoints
        // it beacons to. frame-src keeps 'self' AND adds googletagmanager
        // so Tag Assistant preview still works — note frame-src no longer
        // falls back to default-src once specified, hence the explicit
        // 'self'. Nonce-based script CSP is the later hardening step.
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://www.googletagmanager.com; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob: https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; " +
              "font-src 'self' data:; " +
              "connect-src 'self' https://cloudflareinsights.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; " +
              "frame-src 'self' https://www.googletagmanager.com; " +
              "worker-src 'self' blob:; " +
              "base-uri 'self'; " +
              "form-action 'self'; " +
              "frame-ancestors 'self'; " +
              "object-src 'none'; " +
              "upgrade-insecure-requests",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
