"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * ThemeProvider — class-based theming ("light"/"dark" on <html>) shared by
 * the storefront and the admin console. The dark brand palette stays the
 * default (no-JS first paint keeps the signature look via the hardcoded
 * class on <html>); the toggle flips to the daylight variant and the
 * choice persists per user. enableSystem is off on purpose: the brand
 * ships a curated daylight palette, so a binary switch avoids the OS
 * preference silently re-theming marketing sections mid-session.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
