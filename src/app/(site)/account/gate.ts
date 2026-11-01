/**
 * TereaCOD — server gate for protected /account surfaces.
 */

import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/server/auth-context";

/**
 * Server gate: protected account surfaces require a live session. The
 * client views keep their own hydrated states; this guard keeps anonymous
 * traffic out before any render work happens. Callers pass their own route
 * path so the sign-in redirect returns them to the page they came from.
 */
export async function requireAccountSession(nextPath?: string) {
  const identity = await getCurrentIdentity();
  if (!identity) {
    redirect("/account/sign-in?next=" + encodeURIComponent(nextPath ?? "/account"));
  }
  return identity;
}
