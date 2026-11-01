"use client";

import { createContext, useContext } from "react";

/**
 * Client handle for the staff-console base path ("/admin" — unified login).
 *
 * The base is injected server-side by the admin layout so console views
 * share one link builder; server components use adminBasePath() from
 * @/server/console instead.
 */

export const ConsolePathContext = createContext<string>("/admin");

/** Base path for building console links inside client views. */
export function useConsolePath(): string {
  return useContext(ConsolePathContext);
}

/** Build a console href: consoleHref("/admin", "/orders") → "/admin/orders". */
export function consoleHref(base: string, sub: string): string {
  return `${base}${sub.startsWith("/") ? sub : `/${sub}`}`;
}
