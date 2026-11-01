/**
 * TereaCOD — password hashing.
 *
 * PBKDF2-SHA256 via WebCrypto (native on Node, Bun and Workers — zero deps,
 * no WASM budget concerns). Format is a PHC-style string so algorithms can
 * be upgraded transparently:
 *
 *   pbkdf2$sha256$<iterations>$<salt-b64>$<hash-b64>
 *
 * argon2id (hash-wasm) can be added later by emitting a different prefix —
 * verify() dispatches on it.
 */

import { newToken } from "@/server/ids";

/**
 * 50k — NOT the OWASP 600k recommendation, deliberately.
 *
 * Cloudflare Workers caps request CPU time (10 ms on the free plan) and
 * production workerd also constrains PBKDF2 work. At 600k iterations the
 * derive call costs ~80 ms of CPU: on Workers it throws INSIDE
 * verifyPassword()'s try/catch, which swallows the error and returns false —
 * so EVERY sign-in on production failed with "Email or password is
 * incorrect" even for the correct password (and registration 500'd). 50k
 * costs ~7 ms on sandbox hardware — safe under the free-plan CPU budget.
 *
 * The PHC-style string stores iterations per hash, so this constant only
 * affects NEW hashes; verifyPassword() accepts any stored count. To harden
 * later (paid plan / Durable Object), bump this constant and re-hash users
 * on their next successful login.
 */
const ITERATIONS = 50_000;
const KEY_LENGTH = 32; // bytes
const ALGO = "pbkdf2";
const HASH = "sha256";

function b64encode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64decode(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as BufferSource,
      iterations,
    },
    key,
    KEY_LENGTH * 8
  );
  return new Uint8Array(bits);
}

/** Constant-time equality (xor-accumulate). */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await derive(password, salt, ITERATIONS);
  return `${ALGO}$${HASH}$${ITERATIONS}$${b64encode(salt)}$${b64encode(hash)}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 5 || parts[0] !== ALGO) return false;
  const [, hashName, iterationsRaw, saltB64, hashB64] = parts;
  if (hashName !== HASH) return false;
  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  try {
    const candidate = await derive(password, b64decode(saltB64), iterations);
    return timingSafeEqual(candidate, b64decode(hashB64));
  } catch {
    return false;
  }
}

/** Unusable hash for seeded demo accounts (nobody can sign in as them). */
export async function unusablePasswordHash(): Promise<string> {
  return hashPassword(newToken() + newToken());
}
