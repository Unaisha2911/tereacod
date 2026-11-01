/**
 * TereaCOD — id generation. Prefixed, time-sortable, URL-safe ids
 * (`prd_`, `usr_`, `ord_`…). Uses WebCrypto (identical on Workers).
 */

const RANDOM_BYTES = 10;

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** e.g. newId("prd") → "prd_lz3k9f2a811c4b07d2e0" */
export function newId(prefix: string): string {
  const time = Date.now().toString(36).padStart(8, "0");
  return `${prefix}_${time}${randomHex(RANDOM_BYTES)}`;
}

/** Opaque 256-bit session/token value (raw — only its sha256 is stored). */
export function newToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
