/**
 * TereaCOD — staff console path helper (server only).
 *
 * The console lives at /admin: one unified login for every role. Staff sign
 * in through the normal /account/sign-in form and land straight in the
 * console; the admin layout enforces staff RBAC server-side (non-staff
 * sessions are redirected to /restricted). The path is kept out of search
 * results via robots.txt and noindex metadata, not by secrecy.
 */

export const ADMIN_BASE_PATH = "/admin";

/** The console base path — always "/admin". */
export function adminBasePath(): string {
  return ADMIN_BASE_PATH;
}
