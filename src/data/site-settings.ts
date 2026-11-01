import type { SiteSettings } from "@/types";

/**
 * SEED SITE SETTINGS
 * ------------------
 * Baseline site configuration imported by scripts/seed.ts into the
 * settings KV (settings:site). The admin settings editor writes the live
 * values at runtime — this file is the seed/first-run source, not live
 * configuration.
 */
export const SITE_SETTINGS: SiteSettings = {
  brandName: "TereaCOD",
  brandLegalName: "TereaCOD Trading L.L.C.",
  tagline: "TEREA delivery across the UAE — cash & card on delivery",
  description:
    "TereaCOD.ae is the UAE's TEREA delivery specialist. Shop authentic TEREA heated tobacco sticks made for IQOS ILUMA with transparent AED pricing, age-verified UAE-wide delivery, same-day dispatch from Dubai and cash or card on delivery.",
  locale: "en-AE",
  currency: "AED",
  contact: {
    email: "hello@tereacod.ae",
    supportEmail: "support@tereacod.ae",
    phone: "+971 4 000 0000",
    whatsapp: "+971 50 000 0000",
    addressLines: ["Level 14, Boulevard Plaza Tower 1", "Downtown Dubai", "Dubai, United Arab Emirates"],
    hours: "Sunday–Thursday, 9:00–18:00 GST",
  },
  social: [
    { id: "instagram", label: "Instagram", href: "https://instagram.com" },
    { id: "x", label: "X", href: "https://x.com" },
    { id: "linkedin", label: "LinkedIn", href: "https://linkedin.com" },
  ],
  seo: {
    titleTemplate: "%s — TereaCOD",
    defaultDescription:
      "Order TEREA sticks online in the UAE — authentic IQOS TEREA heated tobacco sticks with same-day dispatch from Dubai, transparent AED pricing, age-verified delivery and cash or card on delivery across all seven Emirates.",
  },
  complianceNotice:
    "This website sells to adult audiences only. Nicotine products are not for sale to persons under 18 — every delivery is age-verified with a valid Emirates ID at the door. Orders are paid by cash or card on delivery.",
  ageRestrictionNotice:
    "You must be at least 18 years old to purchase nicotine products in the United Arab Emirates.",
  smokePreset: "ambient",
  animationIntensity: 0.7,
};
