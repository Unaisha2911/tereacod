/**
 * TereaCOD — server environment & binding configuration.
 *
 * Cloudflare-portable: every value comes from Workers Secrets / vars when
 * deployed (process.env is populated by the adapter), with honest local
 * defaults for sandbox development. Nothing here is ever imported by
 * client code.
 */

export const APP_ENV: "development" | "preview" | "production" =
  (process.env.APP_ENV as "development" | "preview" | "production") ?? "development";

export const IS_PROD = APP_ENV === "production";

/** HMAC key for signed cookie values (cart token). Rotatable via secret. */
export const SESSION_SIGNING_KEY =
  process.env.SESSION_SIGNING_KEY ?? "tereacod-dev-signing-key-DO-NOT-USE-IN-PRODUCTION";

// Production must never boot on the development signing key — forgeable
// session cookies would otherwise be one missed env var away.
if (IS_PROD && !process.env.SESSION_SIGNING_KEY) {
  throw new Error("SESSION_SIGNING_KEY must be set when APP_ENV=production.");
}

/** From address for transactional email (Resend requires a verified sender). */
export const EMAIL_FROM = process.env.EMAIL_FROM ?? "TereaCOD <orders@tereacod.ae>";

/** Optional integrations — each feature degrades gracefully when absent. */
export const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY ?? null;
export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? null;
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? null;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? null;
export const CONTACT_NOTIFY_EMAIL = process.env.CONTACT_NOTIFY_EMAIL ?? null;

/**
 * Cookie names. The `__Host-` prefix requires HTTPS + Secure, which is only
 * true in production; local/preview use plain names so HTTP dev works.
 */
export const SESSION_COOKIE = IS_PROD ? "__Host-session" : "tereacod_session";
export const CART_COOKIE = IS_PROD ? "__Host-cart" : "tereacod_cart";

/** Session lifetimes. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days sliding
export const SESSION_ABSOLUTE_MS = 90 * 24 * 60 * 60 * 1000;
export const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
export const EMAIL_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes (OTP code)

/** 6-digit OTP policy shared by email verification and password reset. */
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60s between sends

/**
 * Secret staff-console base path (e.g. "manage/c3f17fa2e7c8"). The literal
 * /admin URL is dead — middleware 404s it — so the console is reachable only
 * via this non-guessable path. First segment is a fixed namespace
 * ("manage"); the second segment is the secret. Rotate by changing the env
 * var and restarting (Workers: update the var, redeploy).
 */
export const ADMIN_ACCESS_PATH = process.env.ADMIN_ACCESS_PATH ?? "manage/c3f17fa2e7c8";

if (IS_PROD && !process.env.ADMIN_ACCESS_PATH) {
  throw new Error("ADMIN_ACCESS_PATH must be set when APP_ENV=production.");
}

/** Whether cookies must be marked Secure (HTTPS-only deployments). */
export const COOKIE_SECURE = IS_PROD;

/** Cloudflare D1 binding injected at Worker boot (see docs, deploy wiring). */
declare global {
  var __TereaCOD_D1__: D1DatabaseLike | undefined;
  /** Cloudflare R2 MEDIA binding for the upload pipeline (Workers deploys). */
  var __TereaCOD_MEDIA_R2__: MediaR2Like | undefined;
}

/** Minimal structural type for the R2 binding surface we use. */
export interface MediaR2Like {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  /** Public reads for uploaded assets (src/app/api/v1/media/[...key]). */
  get?(
    key: string
  ): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
}

/** Minimal structural type for the D1 binding surface we use. */
export interface D1DatabaseLike {
  prepare(sql: string): {
    bind(...params: unknown[]): {
      all<T>(): Promise<{ results: T[]; success: boolean }>;
      first<T>(): Promise<T | null>;
      run(): Promise<{ meta: { changes: number } }>;
    };
    all<T>(): Promise<{ results: T[]; success: boolean }>;
    first<T>(): Promise<T | null>;
    run(): Promise<{ meta: { changes: number } }>;
  };
  batch(statements: unknown[]): Promise<unknown[]>;
}
