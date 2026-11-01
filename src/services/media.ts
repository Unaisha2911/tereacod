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

  /** Real upload — multipart POST. Resolves to the stored MediaAsset so
   *  callers (media picker, library) can use the asset immediately; it is
   *  persisted in media_assets, so it also appears in the gallery. */
  async upload(file: File, options: { folder?: string; alt?: string } = {}): Promise<MediaAsset> {
    const form = new FormData();
    form.set("file", file);
    if (options.folder) form.set("folder", options.folder);
    if (options.alt) form.set("alt", options.alt);
    const response = await fetch("/api/v1/admin/media", { method: "POST", body: form });
    if (!response.ok) {
      let message = "Upload failed.";
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        message = body.error?.message ?? message;
      } catch {
        /* keep default */
      }
      throw new Error(message);
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
  },

  async remove(id: string): Promise<void> {
    const response = await fetch(`/api/v1/admin/media/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Could not delete this asset.");
  },
};
