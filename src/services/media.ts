import type { MediaAsset } from "@/types";

/**
 * MEDIA SERVICE (API-backed) — uploads now POST multipart to
 * /api/v1/admin/media (R2 on Workers, local uploads in the sandbox).
 */

export interface MediaQuery {
  query?: string;
  folder?: string;
  type?: MediaAsset["type"] | "all";
  view?: "grid" | "list";
}

async function getData<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const body = (await response.json()) as { data: T };
  return body.data;
}

function formatSizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export const mediaService = {
  async list(query: MediaQuery = {}): Promise<MediaAsset[]> {
    const params = new URLSearchParams();
    if (query.query) params.set("q", query.query);
    if (query.folder) params.set("folder", query.folder);
    if (query.type) params.set("type", query.type);
    const data = await getData<{ items: MediaAsset[] }>(`/api/v1/admin/media?${params.toString()}`);
    return data.items;
  },

  /**
   * Real upload — multipart POST with ONE automatic retry.
   *
   * Large images on weak mobile connections (or a Worker that momentarily
   * hit its CPU/memory limit) used to surface as an opaque failure, and the
   * admin's manual re-uploads produced "I had to upload it several times
   * before it showed up". A single transparent retry on transport-level
   * failures removes most of those — validation errors (413/422) are NOT
   * retried because the server rejected the file itself.
   */
  async upload(file: File, options: { folder?: string; alt?: string } = {}): Promise<MediaAsset> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await uploadOnce(file, options, attempt > 0);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Upload failed.");
        // Deterministic server-side rejections (validation, auth, payload
        // limits) would fail identically on a retry — stop immediately.
        if (error instanceof UploadError && error.serverRejected) break;
      }
    }
    throw lastError ?? new Error("Upload failed.");
  },

  async remove(id: string): Promise<void> {
    const response = await fetch(`/api/v1/admin/media/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Could not delete this asset.");
  },
};

/** 90s cap — large images on slow connections stay viable, hung requests fail loudly. */
const UPLOAD_TIMEOUT_MS = 90_000;

async function uploadOnce(
  file: File,
  options: { folder?: string; alt?: string },
  isRetry: boolean
): Promise<MediaAsset> {
  const form = new FormData();
  form.set("file", file);
  if (options.folder) form.set("folder", options.folder);
  if (options.alt) form.set("alt", options.alt);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch("/api/v1/admin/media", {
      method: "POST",
      body: form,
      signal: controller.signal,
      ...(isRetry ? { headers: { "x-terea-upload-retry": "1" } } : {}),
    });
  } catch (error) {
    // Network failure / timeout — retryable by the caller.
    throw error instanceof Error ? error : new Error("Upload failed.");
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    let message = "Upload failed.";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      message = body.error?.message ?? message;
    } catch {
      /* keep default */
    }
    // Server-side rejection (validation/auth/limits) — do not retry blindly.
    const serverRejected = response.status !== 502 && response.status !== 503 && response.status !== 504;
    throw new UploadError(message, serverRejected);
  }
  const body = (await response.json()) as {
    data: { id: string; name: string; url: string; folder: string; alt: string | null };
  };
  const d = body.data;
  return {
    id: d.id,
    name: d.name,
    type: "image",
    format: (d.name.split(".").pop() ?? "").toUpperCase(),
    sizeLabel: formatSizeLabel(file.size),
    folder: d.folder,
    uploadedAt: new Date().toISOString().slice(0, 10),
    alt: d.alt ?? undefined,
    url: d.url,
    status: "ready",
  };
}

/** `serverRejected` marks errors the retry loop must not swallow. */
class UploadError extends Error {
  constructor(message: string, readonly serverRejected: boolean) {
    super(message);
    this.name = "UploadError";
  }
}
