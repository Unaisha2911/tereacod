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
        // Immutable media uploads — every object key is unique per upload
        // (timestamp + uuid), so content can never change under a URL.
        // Mirrors the Cache-Control the /api/v1/media route already sets.
        source: "/uploads/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
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
        // beacon. Nonce-based script CSP is the later hardening step.
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
              "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob:; " +
              "font-src 'self' data:; " +
              "connect-src 'self' https://cloudflareinsights.com; " +
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
