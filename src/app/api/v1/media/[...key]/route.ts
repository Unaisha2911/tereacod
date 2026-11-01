import { withApi, fail, ErrorCode } from "@/server/api/guard";
import { injectWorkerBindings } from "@/server/bindings";
import { getMediaBlob } from "@/server/repos/media";
import { NextResponse } from "next/server";
import path from "node:path";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function guessMime(key: string): string {
  return MIME_BY_EXT[key.slice(key.lastIndexOf(".")).toLowerCase()] ?? "application/octet-stream";
}

function keyFromParams(raw: unknown): string {
  const parts = (Array.isArray(raw) ? raw : [raw])
    .flatMap((segment) => String(segment ?? "").split("/"))
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..");
  return parts.join("/");
}

function asset(body: BodyInit, contentType: string): NextResponse {
  const headers: Record<string, string> = {
    // Object keys are unique per upload (timestamp + uuid) — immutable.
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  if (contentType === "image/svg+xml") {
    // SVG can carry scripts — sandbox it so a malicious staff upload can
    // never execute in the site origin (stored-XSS / privilege escalation).
    headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  }
  return new NextResponse(body, { headers });
}

/**
 * GET /api/v1/media/<key> — public read for admin-uploaded assets.
 *
 * The admin media POST (media.write) stores binaries in the R2 MEDIA binding
 * under `<folder>/<fileName>` and records `url = /api/v1/media/<folder>/<fileName>`
 * in media_assets. This route streams the object back WITHOUT auth — product,
 * legal and marketing content must render for anonymous visitors.
 *
 * Local parity (no R2 binding): reads the same key from public/uploads,
 * mirroring the POST local path.
 */
const handler = withApi({}, async ({ params }) => {
  const key = keyFromParams((params as { key?: string | string[] }).key);
  if (!key) {
    return fail(422, ErrorCode.VALIDATION_FAILED, "Invalid media key.");
  }

  injectWorkerBindings();
  const r2 = globalThis.__TereaCOD_MEDIA_R2__;
  if (r2) {
    const object = await r2.get?.(key);
    if (!object) {
      return fail(404, ErrorCode.NOT_FOUND, "Media not found.");
    }
    return asset(object.body, object.httpMetadata?.contentType ?? guessMime(key));
  }

  // Local sandbox path: resolve strictly inside public/uploads.
  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const filePath = path.normalize(path.join(uploadsRoot, key));
  if (!filePath.startsWith(uploadsRoot + path.sep)) {
    return fail(422, ErrorCode.VALIDATION_FAILED, "Invalid media key.");
  }
  try {
    // node:fs is loaded via process.getBuiltinModule (same pattern as
    // src/server/db/local.ts) rather than a static import: the Worker
    // bundle must never carry a module-load-time fs dependency, and only
    // this local branch ever executes it.
    const fsPromises = (
      process as unknown as { getBuiltinModule?: (id: string) => typeof import("node:fs/promises") }
    ).getBuiltinModule?.("node:fs/promises");
    if (!fsPromises) {
      return fail(404, ErrorCode.NOT_FOUND, "Media not found.");
    }
    const bytes = await fsPromises.readFile(filePath);
    return asset(new Uint8Array(bytes), guessMime(key));
  } catch {
    // Filesystem copy missing (public/uploads is scratch space in the
    // sandbox — wipes have stranded otherwise-valid media rows). Fall back
    // to the durable media_blobs copy and re-materialise the file so the
    // next request takes the fast path again.
    const blob = await getMediaBlob(key).catch(() => null);
    if (blob) {
      void rematerialiseFile(filePath, blob.data).catch(() => undefined);
      const contentType = MIME_BY_EXT[key.slice(key.lastIndexOf(".")).toLowerCase()] ?? blob.mime ?? "application/octet-stream";
      return asset(new Uint8Array(blob.data).slice(), contentType);
    }
    return fail(404, ErrorCode.NOT_FOUND, "Media not found.");
  }
});

/** Best-effort restore of the filesystem copy from the durable blob. */
async function rematerialiseFile(filePath: string, data: Uint8Array): Promise<void> {
  const fsPromises = (
    process as unknown as { getBuiltinModule?: (id: string) => typeof import("node:fs/promises") }
  ).getBuiltinModule?.("node:fs/promises");
  if (!fsPromises) return;
  await fsPromises.mkdir(filePath.slice(0, filePath.lastIndexOf(path.sep)), { recursive: true });
  await fsPromises.writeFile(filePath, data);
}

// Next 16 route-type validation expects the catch-all `params.key: string[]`
// promise shape; the shared guard types params as a flat string record, so
// bridge the two here (runtime values flow through unchanged).
export const GET = (request: Request, context: { params: Promise<{ key: string[] }> }) =>
  handler(request, {
    params: context.params as unknown as Promise<Record<string, string>>,
  });
