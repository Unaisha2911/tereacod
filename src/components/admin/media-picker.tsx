"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { CloudUpload, ImageIcon, Images, Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mediaService } from "@/services/media";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/types";

const UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml";

/**
 * MediaPicker — dialog over the media library (images only) with DIRECT
 * upload. Selecting (or uploading) an asset hands
 * { mediaAssetId, url, alt } to the caller so product images always
 * reference a real media_assets row (FK is RESTRICT). Uploaded files are
 * persisted through the media API, so they land in the library for every
 * other surface (gallery, brand/category pickers) automatically.
 * External URLs are intentionally out of scope — every product image must
 * resolve to a stored asset.
 */
export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  title = "Product image",
  uploadFolder = "products",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (asset: { mediaAssetId: string; url: string; alt: string | null }) => void;
  title?: string;
  /** Library folder new uploads are filed under. */
  uploadFolder?: string;
}) {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(() => new Set());

  // Upload state — one file at a time, with drag & drop.
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    mediaService
      .list({ type: "image" })
      .then((items) => {
        if (alive) {
          setAssets(items);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Could not load the media library.");
      });
    return () => {
      alive = false;
    };
  }, [open]);

  // Reset transient upload state when the dialog closes (in the change
  // handler — no setState-in-effect).
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setUploadError(null);
      setDragOver(false);
      setUploading(false);
    }
    onOpenChange(next);
  };

  // Loading is derived — the fetch runs each time the dialog opens.
  const loading = open && assets === null && error === null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assets ?? [];
    return (assets ?? []).filter(
      (a) => a.name.toLowerCase().includes(term) || (a.alt ?? "").toLowerCase().includes(term)
    );
  }, [assets, search]);

  const pick = (asset: MediaAsset) => {
    onSelect({ mediaAssetId: asset.id, url: asset.url, alt: asset.alt ?? null });
    handleOpenChange(false);
    setSearch("");
  };

  const uploadFile = async (file: File) => {
    if (uploading) return;
    setUploadError(null);
    setUploading(true);
    try {
      const asset = await mediaService.upload(file, { folder: uploadFolder });
      // Show the new asset in the grid immediately, then hand it to the
      // caller — the image is persisted in media_assets, so the library
      // (gallery page) lists it from now on.
      setAssets((prev) => (prev ? [asset, ...prev] : [asset]));
      setUploading(false);
      pick(asset);
    } catch (e) {
      setUploading(false);
      setUploadError(e instanceof Error ? e.message : "Upload failed — try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription>
            Pick from the library or upload a new image below — uploads are stored as library assets (the gallery
            page lists them) and attach to this product immediately. External URLs are not supported.
          </DialogDescription>
        </DialogHeader>

        {/* Direct upload — drag & drop or browse. The upload goes through the
            media API, lands in the library, and is selected automatically. */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a new image"
          aria-disabled={uploading}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (!uploading && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void uploadFile(file);
          }}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line-strong bg-foreground/[0.02] px-4 py-3.5 transition-colors",
            "hover:border-violet-glow/60 hover:bg-violet-glow/[0.04]",
            dragOver && "border-violet-glow/70 bg-violet-glow/[0.07]",
            uploading && "pointer-events-none opacity-60"
          )}
        >
          {uploading ? (
            <Loader2 className="size-5 shrink-0 animate-spin text-violet-soft" aria-hidden="true" />
          ) : (
            <CloudUpload className="size-5 shrink-0 text-violet-soft" aria-hidden="true" />
          )}
          <span className="min-w-0 text-left">
            <span className="block text-[0.84rem] font-medium text-foreground">
              {uploading ? "Uploading…" : "Upload a new image"}
            </span>
            <span className="block truncate text-[0.72rem] text-muted-foreground">
              Drag &amp; drop or browse — JPEG, PNG, WebP, AVIF, GIF or SVG, up to 10 MB. Filed under “
              {uploadFolder}”.
            </span>
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept={UPLOAD_ACCEPT}
            className="sr-only"
            aria-label="Choose an image file to upload"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
              e.target.value = "";
            }}
          />
        </div>
        {uploadError && (
          <p role="alert" className="text-[0.78rem] text-error">
            {uploadError}
          </p>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name or alt text…"
            aria-label="Search the media library"
            className="h-10 w-full rounded-xl border border-line bg-foreground/[0.03] pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-violet-glow/50 focus:outline-none"
          />
        </div>

        <div className="max-h-80 min-h-40 overflow-y-auto rounded-xl border border-line bg-foreground/[0.01] p-3 [scrollbar-color:rgba(127,127,127,0.45)_transparent] [scrollbar-width:thin]">
          {loading ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-foreground/[0.05]" />
              ))}
            </div>
          ) : error ? (
            <p role="alert" className="px-2 py-8 text-center text-sm text-error">
              {error}
            </p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
              <Images className="size-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {assets && assets.length === 0
                  ? "The media library has no images yet — upload one above."
                  : "No images match that search."}
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {filtered.map((asset) => {
                const broken = failedThumbs.has(asset.id);
                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      onClick={() => pick(asset)}
                      title={asset.name}
                      className="group w-full rounded-xl border border-line bg-foreground/[0.02] p-1.5 text-left transition-colors hover:border-violet-glow/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/50"
                    >
                      <span className="relative block aspect-square overflow-hidden rounded-lg bg-black/30">
                        {broken ? (
                          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <ImageIcon className="size-5" aria-hidden="true" />
                          </span>
                        ) : (
                          <Image
                            src={asset.url}
                            alt={asset.alt ?? asset.name}
                            fill
                            unoptimized
                            sizes="140px"
                            className="object-cover transition-transform group-hover:scale-[1.03]"
                            onError={() =>
                              setFailedThumbs((prev) => {
                                const next = new Set(prev);
                                next.add(asset.id);
                                return next;
                              })
                            }
                          />
                        )}
                      </span>
                      <span className="mt-1.5 block truncate px-0.5 text-[0.7rem] text-muted-foreground" aria-hidden="true">
                        {asset.name}
                      </span>
                      <span className="sr-only">Select {asset.alt ?? asset.name} from the media library</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className={cn("text-[0.74rem] text-muted-foreground")} aria-live="polite">
          {assets ? `${assets.length} image${assets.length === 1 ? "" : "s"} in the library` : "Loading library…"}
        </p>
      </DialogContent>
    </Dialog>
  );
}
