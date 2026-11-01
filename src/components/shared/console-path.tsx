"use client";

import { createContext, useContext } from "react";

/**
 * Client handle for the secret staff-console base path.
 *
 * The base (e.g. "/manage/c3f17fa2e7c8") is injected server-side by the
 * admin layout and MUST NOT be baked into the client bundle as a constant —
 * the context keeps every console link correct while the literal /admin
 * stays dead. Server components use adminBasePath() from @/server/console
 * instead.
 */

export const ConsolePathContext = createContext<string>("/admin");

/** Base path for building console links inside client views. */
export function useConsolePath(): string {
  return useContext(ConsolePathContext);
}

/** Build a console href: consoleHref("/manage/x", "/orders") → "/manage/x/orders". */
export function consoleHref(base: string, sub: string): string {
  return `${base}${sub.startsWith("/") ? sub : `/${sub}`}`;
}
