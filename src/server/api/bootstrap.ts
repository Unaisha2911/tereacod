/**
 * TereaCOD — static fallback for site settings (used only when the KV-backed
 * settings document is missing, e.g. before the first seed). Runtime app code
 * never imports src/data — this is a self-contained copy of the default
 * brand configuration.
 */

import type { SiteSettings } from "@/types";

export const SITE_SETTINGS_FALLBACK: SiteSettings = {
  brandName: "TereaCOD",
  brandLegalName: "TereaCOD Trading L.L.C.",
  tagline: "TEREA delivery across the UAE — free delivery at AED 300+, 1-hour delivery, cash or card on delivery",
  description:
    "TereaCOD.ae is the UAE's TEREA delivery specialist. Order authentic TEREA heated tobacco sticks for IQOS ILUMA online with transparent AED pricing, free delivery at AED 300+, 1-hour delivery from Dubai and age-verified UAE-wide delivery — pay by cash or card on delivery.",
  locale: "en-AE",
  currency: "AED",
  contact: {
    email: "hello@tereacod.ae",
    supportEmail: "support@tereacod.ae",
    phone: "+971 4 000 0000",
    whatsapp: "+971 50 000 0000",
    addressLines: [
      "Level 14, Boulevard Plaza Tower 1",
      "Downtown Dubai",
      "Dubai, United Arab Emirates",
    ],
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
      "Order TEREA sticks online in the UAE — authentic IQOS TEREA heated tobacco sticks with 1-hour delivery from Dubai, free delivery at AED 300+, transparent AED pricing, age-verified delivery and cash or card on delivery across all seven Emirates.",
  },
  complianceNotice:
    "This website sells to adult audiences only. Nicotine products are not for sale to persons under 18 — every delivery is age-verified with a valid Emirates ID.",
  ageRestrictionNotice:
    "You must be at least 18 years old to purchase nicotine products in the United Arab Emirates.",
  smokePreset: "ambient",
  animationIntensity: 0.7,
};
