/**
 * TereaCOD — Cloudflare Turnstile verification.
 *
 * When TURNSTILE_SECRET_KEY is configured, tokens are verified server-side
 * with the siteverify API. Without a key (sandbox/preview), verification is
 * a documented no-op so public forms remain usable in development.
 */

import { TURNSTILE_SECRET_KEY } from "@/server/env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

let warnedNoSecret = false;

export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) {
    // Fails open by design in dev/preview — but warn once per isolate in
    // production so a missing secret never goes unnoticed.
    if (process.env.NODE_ENV === "production" && !warnedNoSecret) {
      warnedNoSecret = true;
      console.warn("[turnstile] TURNSTILE_SECRET_KEY is not set — captcha verification is disabled (fail-open).");
    }
    return true;
  }
  if (!token) return false;
  try {
    const body = new FormData();
    body.set("secret", TURNSTILE_SECRET_KEY);
    body.set("response", token);
    if (ip) body.set("remoteip", ip);
    const response = await fetch(VERIFY_URL, { method: "POST", body });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
