/**
 * TereaCOD — HTTP cookie helpers for route handlers.
 */

import { NextResponse } from "next/server";
import { CART_COOKIE, CART_TTL_MS, COOKIE_SECURE, SESSION_COOKIE, SESSION_TTL_MS } from "@/server/env";
import { signValue, verifySignedValue } from "@/server/session";

const BASE_COOKIE = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: COOKIE_SECURE,
  path: "/",
};

export async function setSessionCookie(response: NextResponse, token: string): Promise<void> {
  response.cookies.set(SESSION_COOKIE, await signValue(token), {
    ...BASE_COOKIE,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { ...BASE_COOKIE, maxAge: 0 });
}

export async function setCartCookie(response: NextResponse, token: string): Promise<void> {
  response.cookies.set(CART_COOKIE, await signValue(token), {
    ...BASE_COOKIE,
    maxAge: Math.floor(CART_TTL_MS / 1000),
  });
}

export function clearCartCookie(response: NextResponse): void {
  response.cookies.set(CART_COOKIE, "", { ...BASE_COOKIE, maxAge: 0 });
}

/** Read + verify the cart token from the request cookie header. */
export async function readCartToken(request: Request): Promise<string | null> {
  const header = request.headers.get("cookie") ?? "";
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CART_COOKIE}=`));
  if (!match) return null;
  // Malformed percent-encoding in a client cookie must degrade to "no cart",
  // not 500 the request.
  let raw: string;
  try {
    raw = decodeURIComponent(match.slice(CART_COOKIE.length + 1));
  } catch {
    return null;
  }
  return verifySignedValue(raw);
}

/** Read + verify the session token (used where cookies() is unavailable). */
export async function readSessionToken(request: Request): Promise<string | null> {
  const header = request.headers.get("cookie") ?? "";
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  let raw: string;
  try {
    raw = decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
  } catch {
    return null;
  }
  return verifySignedValue(raw);
}
