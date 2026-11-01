import type { NavigationItem } from "@/types";

/**
 * MOCK NAVIGATION MODEL
 * ---------------------
 * Single source for header, footer and mobile bottom navigation.
 * In production this will be managed in the admin console and served
 * from KV/D1. `enabled: false` items are hidden by the UI.
 */

const n = (
  id: string,
  label: string,
  href: string,
  sortOrder: number,
  location: NavigationItem["location"],
  extra: Partial<NavigationItem> = {}
): NavigationItem => ({ id, label, href, sortOrder, location, enabled: true, ...extra });

export const NAVIGATION_ITEMS: NavigationItem[] = [
  // Header (desktop)
  n("hdr-discover", "Discover", "/discover", 1, "header", { description: "Browse all heat-not-burn sticks" }),
  n("hdr-categories", "Collections", "/collections", 2, "header", { description: "Shop the collections" }),
  n("hdr-brand", "Brands", "/brand", 3, "header", { description: "Every brand we stock" }),
  n("hdr-help", "Help", "/help", 4, "header", { description: "Support and FAQs" }),

  // Mobile bottom navigation — 5 configurable destinations
  n("mob-home", "Home", "/", 1, "mobile", { icon: "home" }),
  n("mob-discover", "Discover", "/discover", 2, "mobile", { icon: "compass" }),
  n("mob-cart", "Cart", "/cart", 3, "mobile", { icon: "cart" }),
  n("mob-saved", "Saved", "/saved", 4, "mobile", { icon: "bookmark" }),
  n("mob-account", "Account", "/account", 5, "mobile", { icon: "user" }),

  // Footer columns
  n("ft-catalog", "Products", "/discover", 1, "footer-column-1"),
  n("ft-categories", "Collections", "/collections", 2, "footer-column-1"),
  n("ft-saved", "Saved items", "/saved", 3, "footer-column-1"),
  n("ft-search", "Search", "/search", 4, "footer-column-1"),

  n("ft-brand", "Brands", "/brand", 1, "footer-column-2"),
  n("ft-about", "Company", "/about", 2, "footer-column-2"),
  n("ft-safety", "Safety", "/safety", 3, "footer-column-2"),
  n("ft-compliance", "Compliance", "/compliance", 4, "footer-column-2"),

  n("ft-help", "Help centre", "/help", 1, "footer-column-3"),
  n("ft-faq", "FAQs", "/help/faq", 2, "footer-column-3"),
  n("ft-contact", "Contact", "/contact", 3, "footer-column-3"),
  n("ft-account", "Your account", "/account", 4, "footer-column-3"),

  // Legal strip
  n("lg-terms", "Terms of Sale", "/legal/terms", 1, "legal"),
  n("lg-privacy", "Privacy Notice", "/legal/privacy", 2, "legal"),
  n("lg-cookies", "Cookie Notice", "/legal/cookies", 3, "legal"),
  n("lg-consumer", "Consumer Information", "/legal/consumer-information", 4, "legal"),
];

export const headerNav = () =>
  NAVIGATION_ITEMS.filter((i) => i.location === "header" && i.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

export const mobileNav = () =>
  NAVIGATION_ITEMS.filter((i) => i.location === "mobile" && i.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

export const footerColumns = () =>
  (["footer-column-1", "footer-column-2", "footer-column-3"] as const).map((loc) =>
    NAVIGATION_ITEMS.filter((i) => i.location === loc && i.enabled).sort((a, b) => a.sortOrder - b.sortOrder)
  );

export const legalNav = () =>
  NAVIGATION_ITEMS.filter((i) => i.location === "legal" && i.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
