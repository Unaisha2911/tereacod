"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { adminService } from "@/services/admin";
import { brandsService } from "@/services/brands";
import { DataTable, type Column } from "@/components/shared/admin-primitives";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField, Select, TextArea, TextInput } from "@/components/forms/fields";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Brand } from "@/types";

/* ------------------------------ helpers --------------------------- */

type BrandRow = Brand & { productCount: number };

const ACCENT_DOT: Record<Brand["accent"], string> = {
  violet: "bg-violet-glow",
  ice: "bg-ice",
  magenta: "bg-magenta-glow",
};

const ACCENT_OPTIONS: Array<{ value: Brand["accent"]; label: string }> = [
  { value: "violet", label: "Violet" },
  { value: "ice", label: "Ice" },
  { value: "magenta", label: "Magenta" },
];

function TableSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-line">
      <div className="h-11 border-b border-line bg-foreground/[0.02]" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-b border-line/60 px-4 py-4 last:border-0">
          <div className="h-4 w-full max-w-sm animate-pulse rounded bg-foreground/[0.05]" />
        </div>
      ))}
    </div>
  );
}

/* --------------------------- brand form ---------------------------- */

type BrandFormMode = { kind: "create" } | { kind: "edit"; brand: BrandRow };

/**
 * Create + edit dialog for brands. Create exposes every column the API
 * accepts (slug is optional and auto-generated when blank); edit shows the
 * slug read-only because slugs are immutable after creation.
 */
function BrandFormDialog({
  mode,
  open,
  onOpenChange,
  onSaved,
}: {
  mode: BrandFormMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (saved: { kind: "create"; slug: string; name: string } | { kind: "edit"; id: string; patch: Partial<BrandRow> }) => void;
}) {
  const { toast } = useToast();
  const isEdit = mode.kind === "edit";

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [blurb, setBlurb] = useState("");
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState("");
  const [established, setEstablished] = useState("");
  const [accent, setAccent] = useState<Brand["accent"]>("violet");
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate the fields from the target row whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    const brand = mode.kind === "edit" ? mode.brand : null;
    setName(brand?.name ?? "");
    setSlug(brand?.slug ?? "");
    setTagline(brand?.tagline ?? "");
    setBlurb(brand?.blurb ?? "");
    setDescription(brand?.description ?? "");
    setOrigin(brand?.origin ?? "");
    setEstablished(brand?.established ?? "");
    setAccent(brand?.accent ?? "violet");
    setFeatured(Boolean(brand?.featured));
  }, [open, mode]);

  const submit = async () => {
    if (saving || name.trim() === "") return;
    setSaving(true);
    try {
      if (mode.kind === "create") {
        const created = await adminService.createBrand({
          name: name.trim(),
          ...(slug.trim() ? { slug: slug.trim() } : {}),
          ...(tagline.trim() ? { tagline: tagline.trim() } : {}),
          ...(blurb.trim() ? { blurb: blurb.trim() } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(origin.trim() ? { origin: origin.trim() } : {}),
          ...(established.trim() ? { established: established.trim() } : {}),
          accent,
          featured,
        });
        toast({ title: "Brand created", description: `${name.trim()} is live at /brand/${created.slug}.` });
        onOpenChange(false);
        onSaved({ kind: "create", slug: created.slug, name: name.trim() });
      } else {
        const brand = mode.brand;
        const patch: Partial<Pick<Brand, "name" | "tagline" | "blurb" | "description" | "origin" | "established" | "accent" | "featured">> = {};
        if (name.trim() !== brand.name) patch.name = name.trim();
        if (tagline.trim() !== brand.tagline) patch.tagline = tagline.trim();
        if (blurb.trim() !== brand.blurb) patch.blurb = blurb.trim();
        if (description.trim() !== brand.description) patch.description = description.trim();
        if (origin.trim() !== brand.origin) patch.origin = origin.trim();
        if (established.trim() !== brand.established) patch.established = established.trim();
        if (accent !== brand.accent) patch.accent = accent;
        if (featured !== Boolean(brand.featured)) patch.featured = featured;

        if (Object.keys(patch).length > 0) {
          await adminService.updateBrand(brand.id, patch);
        }
        toast({ title: "Brand updated", description: `${name.trim()} was saved to the directory.` });
        onOpenChange(false);
        onSaved({ kind: "edit", id: brand.id, patch });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: isEdit ? "Could not update the brand" : "Could not create the brand",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">{isEdit ? `Edit ${mode.brand.name}` : "Add brand"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Edits save to the brand record immediately — the public brand page reflects them right away."
              : "Creates a real brand with a unique slug. Leave the slug blank to auto-generate it from the name."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField label="Name" htmlFor="brand-form-name" required className="sm:col-span-2">
            <TextInput id="brand-form-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. IQOS ILUMA" autoComplete="off" />
          </FormField>

          {isEdit ? (
            <FormField label="Slug" htmlFor="brand-form-slug" hint="Slugs are permanent — links across the storefront point at them." className="sm:col-span-2">
              <TextInput id="brand-form-slug" value={slug} readOnly disabled className="font-mono" />
            </FormField>
          ) : (
            <FormField label="Slug (optional)" htmlFor="brand-form-slug" hint="Lowercase letters, numbers and dashes. Left blank, it is generated from the name." className="sm:col-span-2">
              <TextInput id="brand-form-slug" value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={80} placeholder="e.g. iqos-iluma" className="font-mono" autoComplete="off" />
            </FormField>
          )}

          <FormField label="Tagline" htmlFor="brand-form-tagline" hint="Short line used on tiles and section headers." className="sm:col-span-2">
            <TextInput id="brand-form-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={200} placeholder="e.g. Heat-not-burn tobacco, made for ILUMA only" />
          </FormField>

          <FormField label="Blurb" htmlFor="brand-form-blurb" hint="One-liner for cards and chips." className="sm:col-span-2">
            <TextInput id="brand-form-blurb" value={blurb} onChange={(e) => setBlurb(e.target.value)} maxLength={300} placeholder="e.g. Authentic IQOS ILUMA stock, delivered UAE-wide." />
          </FormField>

          <FormField label="Description" htmlFor="brand-form-description" hint="Longer paragraph shown on the public brand landing page." className="sm:col-span-2">
            <TextArea id="brand-form-description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Tell customers what makes this brand different…" />
          </FormField>

          <FormField label="Origin" htmlFor="brand-form-origin" hint="Where the products are made or sourced.">
            <TextInput id="brand-form-origin" value={origin} onChange={(e) => setOrigin(e.target.value)} maxLength={80} placeholder="e.g. Multi-origin" />
          </FormField>

          <FormField label="Established" htmlFor="brand-form-established" hint="Year or era the brand was founded.">
            <TextInput id="brand-form-established" value={established} onChange={(e) => setEstablished(e.target.value)} maxLength={20} placeholder="e.g. 2021" />
          </FormField>

          <FormField label="Accent" htmlFor="brand-form-accent" hint="Color used for dots, chips and highlights.">
            <Select id="brand-form-accent" value={accent} onChange={(e) => setAccent(e.target.value as Brand["accent"])}>
              {ACCENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="flex items-end pb-1">
            <div className="flex w-full items-start justify-between gap-4 rounded-xl border border-line bg-foreground/[0.02] px-4 py-3">
              <div>
                <p className="text-[0.86rem] font-medium text-foreground">Featured brand</p>
                <p className="mt-0.5 text-[0.76rem] leading-relaxed text-muted-foreground">Highlighted in navigation and homepage surfaces.</p>
              </div>
              <Switch checked={featured} onCheckedChange={setFeatured} aria-label="Featured brand" />
            </div>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || name.trim() === ""}>
              <Plus className="size-4" aria-hidden="true" />
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create brand"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- view ----------------------------- */

export function BrandsView() {
  const [brands, setBrands] = useState<BrandRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<BrandFormMode>({ kind: "create" });
  const [deleteTarget, setDeleteTarget] = useState<BrandRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    Promise.all([brandsService.brands(), brandsService.itemCounts()])
      .then(([b, counts]) => {
        if (alive) {
          setBrands(b.map((row) => ({ ...row, productCount: counts[row.slug] ?? 0 })));
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load brands.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const retry = () => {
    setError(null);
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const openCreate = () => {
    setFormMode({ kind: "create" });
    setFormOpen(true);
  };

  const openEdit = (row: BrandRow) => {
    setFormMode({ kind: "edit", brand: row });
    setFormOpen(true);
  };

  const onFormSaved = (saved: { kind: "create"; slug: string; name: string } | { kind: "edit"; id: string; patch: Partial<BrandRow> }) => {
    if (saved.kind === "create") {
      setReloadKey((k) => k + 1);
    } else {
      setBrands((prev) => (prev ? prev.map((b) => (b.id === saved.id ? { ...b, ...saved.patch } : b)) : prev));
    }
  };

  /** Optimistic toggle — reverts and toasts when the API rejects it. */
  const onToggleFeatured = async (row: BrandRow, next: boolean) => {
    setBrands((prev) => (prev ? prev.map((b) => (b.id === row.id ? { ...b, featured: next } : b)) : prev));
    try {
      await adminService.updateBrand(row.id, { featured: next });
    } catch (error) {
      setBrands((prev) => (prev ? prev.map((b) => (b.id === row.id ? { ...b, featured: row.featured } : b)) : prev));
      toast({
        variant: "destructive",
        title: "Could not update the brand",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const onChangeAccent = async (row: BrandRow, accent: Brand["accent"]) => {
    setBrands((prev) => (prev ? prev.map((b) => (b.id === row.id ? { ...b, accent } : b)) : prev));
    try {
      await adminService.updateBrand(row.id, { accent });
    } catch (error) {
      setBrands((prev) => (prev ? prev.map((b) => (b.id === row.id ? { ...b, accent: row.accent } : b)) : prev));
      toast({
        variant: "destructive",
        title: "Could not update the brand",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await adminService.deleteBrand(deleteTarget.id);
      toast({ title: "Brand deleted", description: `${deleteTarget.name} was removed from the directory.` });
      setDeleteTarget(null);
      setReloadKey((k) => k + 1);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const deleteButton = (row: BrandRow) => (
    <button
      type="button"
      onClick={() => setDeleteTarget(row)}
      aria-label={`Delete ${row.name}`}
      className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  );

  const editButton = (row: BrandRow) => (
    <button
      type="button"
      onClick={() => openEdit(row)}
      aria-label={`Edit ${row.name}`}
      className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
    >
      <Pencil className="size-4" aria-hidden="true" />
    </button>
  );

  const columns: Column<BrandRow>[] = [
    {
      key: "name",
      header: "Brand",
      sortable: true,
      sortValue: (row) => row.name,
      cell: (row) => (
        <span className="block">
          <span className="block font-medium text-foreground">{row.name}</span>
          <span className="mt-0.5 block max-w-xs truncate text-[0.76rem] text-muted-foreground">{row.tagline}</span>
        </span>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      sortable: true,
      sortValue: (row) => row.slug,
      cell: (row) => <code className="font-mono text-[0.78rem] text-muted-foreground">{row.slug}</code>,
    },
    {
      key: "origin",
      header: "Origin",
      sortable: true,
      sortValue: (row) => row.origin,
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.origin || "—"}
          {row.established ? <span className="block text-[0.74rem] text-muted-foreground/70">est. {row.established}</span> : null}
        </span>
      ),
    },
    {
      key: "products",
      header: "Products",
      sortable: true,
      sortValue: (row) => row.productCount,
      className: "text-center",
      cell: (row) => <span className="text-muted-foreground">{row.productCount}</span>,
    },
    {
      key: "featured",
      header: "Featured",
      cell: (row) => (
        <span className="inline-flex items-center gap-2">
          <Switch checked={Boolean(row.featured)} onCheckedChange={(v) => void onToggleFeatured(row, v)} aria-label={`Feature ${row.name}`} />
          <span className="text-[0.76rem] text-muted-foreground">{row.featured ? "Featured" : "Standard"}</span>
        </span>
      ),
    },
    {
      key: "accent",
      header: "Accent",
      cell: (row) => (
        <span className="inline-flex items-center gap-2">
          <span className={cn("size-3 shrink-0 rounded-full", ACCENT_DOT[row.accent])} aria-hidden="true" />
          <Select
            aria-label={`Accent for ${row.name}`}
            value={row.accent}
            onChange={(e) => void onChangeAccent(row, e.target.value as Brand["accent"])}
            className="h-9 w-32 text-[0.82rem]"
          >
            {ACCENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-28 text-right",
      cell: (row) => (
        <span className="inline-flex items-center justify-end gap-1">
          {editButton(row)}
          <Link
            href={`/brand/${row.slug}`}
            aria-label={`Open the public page for ${row.name}`}
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-violet-soft"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
          </Link>
          {deleteButton(row)}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-h2 font-bold tracking-tight text-foreground">Brands</h1>
          <p className="mt-1.5 max-w-2xl text-[0.92rem] text-muted-foreground">
            The brand directory — names, taglines, product counts, featured flags and accent colors. Featured and
            accent save instantly; full details live in the edit dialog.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" aria-hidden="true" />
          Add brand
        </Button>
      </header>

      {error ? (
        <ErrorState body={error} onRetry={retry} />
      ) : loading && !brands ? (
        <TableSkeleton />
      ) : brands && brands.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="No brands"
          body="The brand directory is empty — add the first brand to start building the catalog."
          actionLabel="Add brand"
          onAction={openCreate}
        />
      ) : brands ? (
        <DataTable
          columns={columns}
          rows={brands}
          initialSort={{ key: "name", dir: "asc" }}
          caption="Storefront brand directory"
          mobileCard={(row) => (
            <div className="rounded-2xl border border-line bg-elevated/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <span>
                  <span className="block font-display text-[0.98rem] font-semibold text-foreground">{row.name}</span>
                  <span className="mt-0.5 block text-[0.78rem] text-muted-foreground">{row.tagline}</span>
                </span>
                <span className={cn("mt-1.5 size-3 shrink-0 rounded-full", ACCENT_DOT[row.accent])} aria-hidden="true" />
              </div>
              <p className="mt-1 font-mono text-[0.76rem] text-muted-foreground">{row.slug}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
                <span className="text-[0.8rem] text-muted-foreground">{row.productCount} products</span>
                <span className="inline-flex items-center gap-2">
                  <Switch checked={Boolean(row.featured)} onCheckedChange={(v) => void onToggleFeatured(row, v)} aria-label={`Feature ${row.name}`} />
                  {editButton(row)}
                  <Link href={`/brand/${row.slug}`} aria-label={`Open the public page for ${row.name}`} className="text-violet-soft">
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </Link>
                  {deleteButton(row)}
                </span>
              </div>
            </div>
          )}
          emptyMessage="No brands match."
        />
      ) : null}

      <BrandFormDialog open={formOpen} mode={formMode} onOpenChange={setFormOpen} onSaved={onFormSaved} />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Brands with products attached cannot be deleted — move those products to another brand first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              className="bg-error text-white hover:bg-error/90"
            >
              {deleting ? "Deleting…" : "Delete brand"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
