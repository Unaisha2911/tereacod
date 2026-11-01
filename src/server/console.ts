/**
 * TereaCOD — staff console path helper (server only).
 *
 * The console lives internally at /admin/* (route folder), but that literal
 * URL is dead: middleware returns a hard 404 for it. The public surface is
 * ADMIN_ACCESS_PATH (e.g. "/manage/c3f17fa2e7c8") which middleware rewrites
 * to /admin/* after checking the session cookie. Server components and
 * route handlers use adminBasePath() to build links/redirects; client
 * components receive the base through props or the ConsolePathContext in
 * src/components/shared/console-path.tsx — never via NEXT_PUBLIC_* (that
 * would ship the secret to every visitor).
 */

import { ADMIN_ACCESS_PATH } from "@/server/env";

/** "/manage/<secret>" — always starts with a single slash. */
export function adminBasePath(): string {
  const trimmed = ADMIN_ACCESS_PATH.replace(/^\/+|\/+$/g, "");
  return `/${trimmed}`;
}

/**
 * True when the pathname is the secret console root or a subpath of it.
 * Used by server gates that must not depend on the request URL shape.
 */
export function isConsolePath(pathname: string): boolean {
  const base = adminBasePath();
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Map a secret-path URL to the internal /admin route (middleware rewrite). */
export function consolePathToInternal(pathname: string): string {
  const base = adminBasePath();
  const rest = pathname === base ? "" : pathname.slice(base.length);
  return `/admin${rest}`;
}
