"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileText,
  Film,
  FolderOpen,
  Hourglass,
  ImageOff,
  Images,
  LayoutGrid,
  Link2,
  List,
  MoreVertical,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { mediaService } from "@/services/media";
import { adminService } from "@/services/admin";
import { DataTable, FilterBar, SearchField, type Column } from "@/components/shared/admin-primitives";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FormField, TextInput } from "@/components/forms/fields";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/types";
import { formatDate } from "@/lib/format";

/* ------------------------------ helpers --------------------------- */

type FolderFilter = "products" | "brand" | "legal" | "general";
type TypeFilter = MediaAsset["type"];

const FOLDER_OPTIONS: Array<{ value: FolderFilter | "all"; label: string }> = [
  { value: "all", label: "All folders" },
  { value: "products", label: "Products" },
  { value: "brand", label: "Brand" },
  { value: "general", label: "General" },
  { value: "legal", label: "Legal" },
];

const TYPE_OPTIONS: Array<{ value: TypeFilter | "all"; label: string }> = [
  { value: "all", label: "All types" },
  { value: "image", label: "Images" },
];

function statusBadge(asset: MediaAsset) {
  if (asset.status === "processing") {
    return (
      <StatusBadge tone="warning" icon={Hourglass} className="animate-pulse">
        Processing
      </StatusBadge>
    );
  }
  if (asset.status === "failed") {
    return (
      <StatusBadge tone="error" icon={AlertTriangle}>
        Failed
      </StatusBadge>
    );
  }
  return (
    <StatusBadge tone="success" icon={CheckCircle2}>
      Ready
    </StatusBadge>
  );
}

function statusDot(asset: MediaAsset) {
  return (
    <span
      title={asset.status}
      className={cn(
        "size-2 rounded-full",
        asset.status === "ready" && "bg-success",
        asset.status === "processing" && "animate-pulse bg-warning",
        asset.status === "failed" && "bg-error"
      )}
      aria-hidden="true"
    />
  );
}

function TableSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-line">
      <div className="h-11 border-b border-line bg-foreground/[0.02]" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-b border-line/60 px-4 py-4 last:border-0">
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-foreground/[0.05]" />
        </div>
      ))}
    </div>
  );
}

/** Read the API error message out of the standard error envelope. */
async function apiErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

/* ---------------------------- asset menu -------------------------- */

/** Dropdown used on grid cards and mobile cards (no clipping ancestors). */
function AssetMenu({
  asset,
  onCopy,
  onRequestDelete,
}: {
  asset: MediaAsset;
  onCopy: (asset: MediaAsset) => void;
  onRequestDelete: (asset: MediaAsset) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={`Actions for ${asset.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex size-9 items-center justify-center rounded-xl border border-line bg-elevated/60 text-muted-foreground transition-colors hover:text-foreground"
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={`Actions for ${asset.name}`}
          className="absolute right-0 top-10 z-30 w-48 overflow-hidden rounded-xl border border-line bg-abyss shadow-xl shadow-black/40"
        >
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onCopy(asset);
            }}
            className="flex min-h-10 w-full items-center gap-2.5 px-3.5 text-left text-[0.84rem] text-foreground transition-colors hover:bg-foreground/[0.05]"
          >
            <Copy className="size-4 text-muted-foreground" aria-hidden="true" />
            Copy URL
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onRequestDelete(asset);
            }}
            className="flex min-h-10 w-full items-center gap-2.5 border-t border-line px-3.5 text-left text-[0.84rem] text-error transition-colors hover:bg-error/10"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/** Inline actions for the list view — the table clips dropdowns, so no menu. */
function AssetActions({
  asset,
  onCopy,
  onRequestDelete,
}: {
  asset: MediaAsset;
  onCopy: (asset: MediaAsset) => void;
  onRequestDelete: (asset: MediaAsset) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        aria-label={`Copy URL for ${asset.name}`}
        title="Copy URL"
        onClick={(e) => {
          e.stopPropagation();
          onCopy(asset);
        }}
        className="inline-flex size-9 items-center justify-center rounded-xl border border-line text-muted-foreground transition-colors hover:text-foreground"
      >
        <Copy className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={`Delete ${asset.name}`}
        title="Delete"
        onClick={(e) => {
          e.stopPropagation();
          onRequestDelete(asset);
        }}
        className="inline-flex size-9 items-center justify-center rounded-xl border border-line text-muted-foreground transition-colors hover:border-error/40 hover:text-error"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ------------------------------- view ----------------------------- */

export function MediaLibraryView() {
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<FolderFilter | "all">("all");
  const [type, setType] = useState<TypeFilter | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [altDraft, setAltDraft] = useState("");
  const [savingAlt, setSavingAlt] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MediaAsset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    mediaService
      .list({ query, folder, type })
      .then((d) => {
        if (alive) {
          setAssets(d);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load the media library.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [query, folder, type, reloadKey]);

  const onQueryChange = (next: string) => {
    setQuery(next);
    setLoading(true);
  };
  const onFolderChange = (next: FolderFilter | "all") => {
    setFolder(next);
    setLoading(true);
  };
  const onTypeChange = (next: TypeFilter | "all") => {
    setType(next);
    setLoading(true);
  };
  const retry = () => {
    setError(null);
    setLoading(true);
    setReloadKey((k) => k + 1);
  };
  const clearFilters = () => {
    setQuery("");
    setFolder("all");
    setType("all");
    setError(null);
    setLoading(true);
  };

  const openPreview = (asset: MediaAsset) => {
    setSelected(asset);
    setAltDraft(asset.alt ?? "");
  };

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      await mediaService.upload(file);
      toast({
        title: "Upload complete",
        description: `${file.name} is in the library's general folder. New uploads land there unless a folder is specified.`,
      });
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: e instanceof Error ? e.message : "The media service returned an error. Try again.",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const copyUrl = (asset: MediaAsset) => {
    const absolute = `${window.location.origin}${asset.url}`;
    navigator.clipboard
      .writeText(absolute)
      .then(() => {
        toast({ title: "URL copied", description: absolute });
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Copy failed",
          description: "The clipboard is unavailable — select the path from the preview dialog instead.",
        });
      });
  };

  const saveAlt = async () => {
    if (!selected) return;
    setSavingAlt(true);
    try {
      await adminService.updateMedia(selected.id, { alt: altDraft });
      const nextAlt = altDraft.trim() === "" ? undefined : altDraft.trim();
      setAssets((prev) => (prev ? prev.map((a) => (a.id === selected.id ? { ...a, alt: nextAlt } : a)) : prev));
      setSelected((prev) => (prev && prev.id === selected.id ? { ...prev, alt: nextAlt } : prev));
      toast({
        title: "Alt text saved",
        description: nextAlt ? `Alt text for ${selected.name} is live.` : `Alt text for ${selected.name} cleared.`,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSavingAlt(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      // DELETE via the media API — the response envelope carries the exact
      // failure reason (permissions, missing asset), which we surface as-is.
      const response = await fetch(`/api/v1/admin/media/${encodeURIComponent(pendingDelete.id)}`, {
        method: "DELETE",
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(await apiErrorMessage(response, "Could not delete this asset."));
      }
      const removedId = pendingDelete.id;
      const removedName = pendingDelete.name;
      setAssets((prev) => (prev ? prev.filter((a) => a.id !== removedId) : prev));
      setSelected((prev) => (prev && prev.id === removedId ? null : prev));
      setPendingDelete(null);
      toast({ title: "Asset deleted", description: `${removedName} was moved to trash.` });
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<MediaAsset>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (row) => row.name,
      cell: (row) => (
        <button
          type="button"
          onClick={() => openPreview(row)}
          className="text-left font-medium text-foreground underline-offset-4 transition-colors hover:text-violet-soft hover:underline"
        >
          {row.name}
        </button>
      ),
    },
    { key: "type", header: "Type", sortable: true, sortValue: (row) => row.type, cell: (row) => <span className="capitalize text-muted-foreground">{row.type}</span> },
    { key: "format", header: "Format", cell: (row) => <span className="text-muted-foreground">{row.format}</span> },
    { key: "size", header: "Size", cell: (row) => <span className="text-muted-foreground">{row.sizeLabel}</span> },
    { key: "dimensions", header: "Dimensions", cell: (row) => <span className="text-muted-foreground">{row.dimensions ?? "—"}</span> },
    { key: "folder", header: "Folder", sortable: true, sortValue: (row) => row.folder, cell: (row) => <span className="capitalize text-muted-foreground">{row.folder}</span> },
    { key: "uploadedAt", header: "Uploaded", sortable: true, sortValue: (row) => row.uploadedAt, cell: (row) => <span className="text-muted-foreground">{formatDate(row.uploadedAt)}</span> },
    { key: "status", header: "Status", cell: (row) => statusBadge(row) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => <AssetActions asset={row} onCopy={copyUrl} onRequestDelete={setPendingDelete} />,
    },
  ];

  const hasFilters = query.trim() !== "" || folder !== "all" || type !== "all";
  const firstLoad = loading && !assets;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header>
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-violet-soft">Media</p>
        <h1 className="mt-1 font-display text-h2 font-bold tracking-tight text-foreground">Media library</h1>
        <p className="mt-1.5 max-w-2xl text-[0.92rem] text-muted-foreground">
          Images, video and documents across the products, brand, general and legal folders. Every asset has a
          copy-URL and delete action; alt text saves to the media record.
        </p>
      </header>

      <PrototypeNotice>The library reads live records from the media database. Uploads are stored on the server in local development mode — object storage (R2) lands with the cloud deployment.</PrototypeNotice>

      {/* Upload dropzone */}
      <div className="rounded-2xl border border-dashed border-line-strong bg-foreground/[0.02] px-6 py-7 text-center">
        <UploadCloud className="mx-auto size-6 text-violet-soft" aria-hidden="true" />
        <p className="mt-2.5 font-display text-[0.98rem] font-semibold text-foreground">Upload to the library</p>
        <p className="mx-auto mt-1 max-w-md text-[0.8rem] leading-relaxed text-muted-foreground">
          Browse files to upload — new files land in the <strong className="font-semibold text-foreground">general</strong> folder
          and appear in the grid below.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Choose an image to upload"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onUpload(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
        >
          <UploadCloud className="size-4" aria-hidden="true" />
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchField
            value={query}
            onChange={onQueryChange}
            label="Search media by name or alt text"
            placeholder="Search name or alt text…"
            className="w-full lg:w-80"
          />
          <div
            role="group"
            aria-label="Toggle grid or list view"
            className="inline-flex items-center gap-1 rounded-full border border-line p-1"
          >
            <button
              type="button"
              aria-pressed={view === "grid"}
              aria-label="Grid view"
              onClick={() => setView("grid")}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full transition-colors",
                view === "grid" ? "bg-violet-glow/15 text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-pressed={view === "list"}
              aria-label="List view"
              onClick={() => setView("list")}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full transition-colors",
                view === "list" ? "bg-violet-glow/15 text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <FilterBar options={FOLDER_OPTIONS} value={folder} onChange={onFolderChange} ariaLabel="Filter by folder" />
          <FilterBar options={TYPE_OPTIONS} value={type} onChange={onTypeChange} ariaLabel="Filter by media type" />
        </div>
      </div>

      {error ? (
        <ErrorState body={error} onRetry={retry} />
      ) : firstLoad ? (
        <TableSkeleton />
      ) : assets && assets.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No assets match"
          body="Try a different search, folder or type filter — clear the filters to see every asset in the library."
          {...(hasFilters
            ? {
                actionLabel: "Clear filters",
                onAction: clearFilters,
              }
            : {})}
        />
      ) : assets ? (
        <div className="space-y-3">
          {loading && <LoadingIndicator label="Refreshing" size="sm" />}
          <div className={cn(loading && "pointer-events-none opacity-50 transition-opacity")}>
            {view === "grid" ? (
              <ul role="list" className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {assets.map((asset) => {
                  const thumbFailed = failedThumbs.has(asset.id);
                  return (
                    <li key={asset.id} className="relative">
                      <button
                        type="button"
                        onClick={() => openPreview(asset)}
                        aria-label={`Preview ${asset.name}`}
                        className="group w-full rounded-2xl border border-line bg-elevated/40 p-3 text-left transition-colors hover:border-violet-glow/40"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-foreground/[0.02]">
                          {asset.type === "image" && !thumbFailed ? (
                            <Image
                              src={asset.url}
                              alt={asset.alt ?? asset.name}
                              fill
                              unoptimized
                              sizes="(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw"
                              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                              onError={() =>
                                setFailedThumbs((prev) => {
                                  const next = new Set(prev);
                                  next.add(asset.id);
                                  return next;
                                })
                              }
                            />
                          ) : (
                            <span className="flex h-full items-center justify-center text-muted-foreground">
                              {asset.type === "video" ? (
                                <Film className="size-8" aria-hidden="true" />
                              ) : asset.type === "document" ? (
                                <FileText className="size-8" aria-hidden="true" />
                              ) : (
                                <ImageOff className="size-8" aria-hidden="true" />
                              )}
                            </span>
                          )}
                          {asset.status === "processing" && (
                            <span className="absolute left-2 top-2">
                              <StatusBadge tone="warning" icon={Hourglass} className="animate-pulse">
                                Processing
                              </StatusBadge>
                            </span>
                          )}
                        </div>
                        <div className="mt-2.5 flex items-center justify-between gap-2 pr-10">
                          <p className="truncate text-[0.84rem] font-medium text-foreground">{asset.name}</p>
                          {statusDot(asset)}
                        </div>
                        <p className="mt-0.5 truncate text-[0.74rem] text-muted-foreground">
                          {asset.dimensions ? `${asset.dimensions} · ` : ""}
                          {asset.format} · {asset.sizeLabel}
                        </p>
                      </button>
                      <div className="absolute right-3 top-3 z-10">
                        <AssetMenu asset={asset} onCopy={copyUrl} onRequestDelete={setPendingDelete} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <DataTable
                columns={columns}
                rows={assets}
                initialSort={{ key: "uploadedAt", dir: "desc" }}
                caption="Media assets"
                mobileCard={(row) => (
                  <div className="flex items-start gap-3 rounded-2xl border border-line bg-elevated/40 p-4">
                    <button
                      type="button"
                      onClick={() => openPreview(row)}
                      className="min-w-0 flex-1 text-left"
                      aria-label={`Preview ${row.name}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium text-foreground">{row.name}</span>
                        {statusBadge(row)}
                      </div>
                      <p className="mt-1.5 text-[0.78rem] capitalize text-muted-foreground">
                        {row.type} · {row.folder} folder · {row.format} · {row.sizeLabel}
                        {row.dimensions ? ` · ${row.dimensions}` : ""}
                      </p>
                      <p className="mt-0.5 text-[0.74rem] text-muted-foreground">Uploaded {formatDate(row.uploadedAt)}</p>
                    </button>
                    <AssetMenu asset={row} onCopy={copyUrl} onRequestDelete={setPendingDelete} />
                  </div>
                )}
                emptyMessage="No assets match the current filters."
              />
            )}
            <p className="mt-1 text-[0.78rem] text-muted-foreground">
              Showing {assets.length} library {assets.length === 1 ? "asset" : "assets"}
              {hasFilters ? " (filtered)" : ""}.
            </p>
          </div>
        </div>
      ) : null}

      {/* Preview dialog */}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Asset preview</DialogTitle>
                <DialogDescription>
                  Metadata from the media record — alt text saves to the asset via the media API.
                </DialogDescription>
              </DialogHeader>

              <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-line bg-foreground/[0.02]">
                {selected.type === "image" && !failedThumbs.has(selected.id) ? (
                  <Image
                    src={selected.url}
                    alt={selected.alt ?? selected.name}
                    fill
                    unoptimized
                    sizes="480px"
                    className="object-cover"
                    onError={() =>
                      setFailedThumbs((prev) => {
                        const next = new Set(prev);
                        next.add(selected.id);
                        return next;
                      })
                    }
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-muted-foreground">
                    {selected.type === "video" ? (
                      <Film className="size-10" aria-hidden="true" />
                    ) : selected.type === "document" ? (
                      <FileText className="size-10" aria-hidden="true" />
                    ) : (
                      <ImageOff className="size-10" aria-hidden="true" />
                    )}
                  </span>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {[
                  ["Name", selected.name],
                  ["Format", selected.format],
                  ["Size", selected.sizeLabel],
                  ["Dimensions", selected.dimensions ?? "—"],
                  ["Folder", selected.folder],
                  ["Uploaded", formatDate(selected.uploadedAt)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 truncate capitalize text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>

              <FormField label="Alt text" htmlFor="media-alt" hint="Describes the asset for screen readers (max 200 characters).">
                <TextInput
                  id="media-alt"
                  value={altDraft}
                  onChange={(e) => setAltDraft(e.target.value)}
                  maxLength={200}
                />
              </FormField>

              <div className="flex flex-wrap items-center justify-between gap-3">
                {statusBadge(selected)}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyUrl(selected)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-foreground transition-colors hover:border-line-strong"
                  >
                    <Link2 className="size-4" aria-hidden="true" />
                    Copy URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(selected)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-error/40 px-4 text-sm font-medium text-error transition-colors hover:bg-error/10"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveAlt()}
                    disabled={savingAlt}
                    className="inline-flex min-h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
                  >
                    {savingAlt ? "Saving…" : "Save alt"}
                  </button>
                </div>
              </div>
              <p className="flex items-center gap-2 text-[0.76rem] text-muted-foreground">
                <FolderOpen className="size-3.5" aria-hidden="true" />
                Path <code className="font-mono">{selected.url}</code>
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The asset moves to trash and disappears from the library. Products or pages still referencing this URL
              will lose the image. This cannot be undone from the console.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-error text-white hover:bg-error/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Deleting…" : "Delete asset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
