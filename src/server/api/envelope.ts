/**
 * TereaCOD — API response envelope.
 *
 * Success: { data, meta? }   Error: { error: { code, message, fields?, requestId? } }
 * Every handler returns through these helpers so clients can unwrap uniformly.
 */

import { NextResponse } from "next/server";

export interface Meta {
  pagination?: { page: number; pageSize: number; total: number; hasMore: boolean };
  [key: string]: unknown;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    requestId?: string;
  };
}

export function ok<T>(data: T, meta?: Meta, init?: ResponseInit): NextResponse {
  return NextResponse.json(meta ? { data, meta } : { data }, init);
}

/**
 * CDN cache policy for PUBLIC, cookie-independent GET endpoints.
 *
 * These responses are identical for every visitor (catalog, content, site
 * settings) — on Cloudflare a shared s-maxage lets the edge serve repeat
 * requests without invoking the Worker at all, removing the D1 round trips
 * entirely. stale-while-revalidate keeps responses warm while refreshing.
 * Per-user surfaces (session, cart, saved, account, admin) must NEVER use
 * this — they stay no-store.
 */
export const CDN_CACHE = {
  /** Catalog listings/product pages — admin edits invalidate the isolate cache immediately; edge converges in 60s. */
  catalog: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
  /** Site settings (brand contact/socials) — short, same rationale. */
  settings: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
  /** Long-lived text content (FAQ, legal, compliance). */
  content: { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600" },
  /** Search results keyed by query string — snappy but bounded. */
  search: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" },
} as const;

export function created<T>(data: T, meta?: Meta): NextResponse {
  return ok(data, meta, { status: 201 });
}

export function fail(
  status: number,
  code: string,
  message: string,
  extra?: { fields?: Record<string, string>; requestId?: string; headers?: Record<string, string> }
): NextResponse {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      ...(extra?.fields ? { fields: extra.fields } : {}),
      ...(extra?.requestId ? { requestId: extra.requestId } : {}),
    },
  };
  return NextResponse.json(body, {
    status,
    headers: extra?.headers,
  });
}

/** Common error codes. */
export const ErrorCode = {
  VALIDATION_FAILED: "validation_failed",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  CONFLICT: "conflict",
  RATE_LIMITED: "rate_limited",
  UNAVAILABLE: "unavailable",
  INTERNAL: "internal_error",
} as const;
