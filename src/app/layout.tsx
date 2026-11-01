import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Orbitron, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { SITE_ORIGIN, JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

/**
 * Root metadata constants — inlined here (NOT imported from src/data, which
 * is seed-only input). Runtime-editable settings live in KV via the settings
 * repo and surface on pages; the root document metadata stays static.
 */
const BRAND = {
  name: "TereaCOD",
  legalName: "TereaCOD Trading L.L.C.",
  tagline: "TEREA delivery across the UAE — cash & card on delivery",
  description:
    "TereaCOD.ae is the UAE's TEREA delivery specialist. Order authentic TEREA heated tobacco sticks for IQOS ILUMA online with transparent AED pricing, age-verified UAE-wide delivery and same-day dispatch from Dubai — pay by cash or card on delivery.",
} as const;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Orbitron — squared, wide techno letterforms in the spirit of the
 * Cybertruck wordmark. Reserved for major headings (neon treatments).
 * Only font-bold (700) is used across the neon system.
 */
const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Canonical origin comes from the deployment environment; production builds
  // default to the live domain so a missing build-time variable can never bake
  // `localhost` into metadata (single source of truth: SITE_ORIGIN in seo.tsx).
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "TEREA Delivery UAE — TEREA Sticks Cash & Card on Delivery",
    // Pipe separator keeps generated titles scannable in SERPs while the
    // page-level titles carry the primary keywords.
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  keywords: [
    "terea delivery uae",
    "terea delivery dubai",
    "terea sticks uae",
    "buy terea online uae",
    "terea cash on delivery",
    "terea card on delivery",
    "iqos terea uae",
    "terea uae",
    "terea dubai delivery",
    "terea abu dhabi",
    "terea same day delivery",
    "heated tobacco delivery uae",
    "heat not burn uae",
    "iqos iluma sticks uae",
    "terea flavours dubai",
    "tereacod",
    "tereacod.ae",
  ],
  applicationName: BRAND.name,
  authors: [{ name: BRAND.legalName }],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    siteName: BRAND.name,
    type: "website",
    locale: "en_AE",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: `${BRAND.name} — ${BRAND.tagline}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#060409",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* NOTE: the page-wide smoke texture preload moved to the (site)
            layout — the admin console ships no smoke atmosphere and must
            not pay 196KB of preload on every console navigation. */}
        {/* Age-gate pre-paint boot (raw <head> script — outside the React
            hydration tree, so it can never cause a hydration mismatch):
            locks the page (html.age-gate-locked) BEFORE first paint when no
            18+ consent is stored, so the gate overlay in AppShell covers the
            site from the very first frame. Skipped on /admin — the console
            has no gate and must never inherit the scroll lock. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(!location.pathname.startsWith("/admin")&&localStorage.getItem("tereacod.age-gate.v1")!=="1"){document.documentElement.classList.add("age-gate-locked")}}catch(e){if(!location.pathname.startsWith("/admin")){document.documentElement.classList.add("age-gate-locked")}}`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${orbitron.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only z-[9999] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>
        {/* ThemeProvider owns the html.light/dark class for the whole app
            (storefront + admin); default stays the dark brand palette. */}
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster />
        {/* Site-wide structured data: Organisation + WebSite/SearchAction. */}
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      </body>
    </html>
  );
}
