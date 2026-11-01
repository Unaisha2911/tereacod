import type { MetadataRoute } from "next";

/**
 * PWA WEB APP MANIFEST
 * --------------------
 * Aligns the storefront with the existing /offline state page: name,
 * brand colours and icon set for installable sessions. Icons reuse the
 * logo SVG; theme colours match globals.css tokens.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TereaCOD — TEREA Delivery UAE · Cash & Card on Delivery",
    short_name: "TereaCOD",
    description:
      "Order authentic TEREA heated tobacco sticks for IQOS ILUMA with transparent AED pricing, age-verified UAE-wide delivery and cash or card on delivery.",
    id: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#060409",
    theme_color: "#060409",
    lang: "en-AE",
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
