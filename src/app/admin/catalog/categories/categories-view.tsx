"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { adminService } from "@/services/admin";
import { catalogService } from "@/services/catalog";
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
import type { CatalogCategory } from "@/types";

/* ------------------------------ helpers --------------------------- */

const ACCENT_DOT: Record<CatalogCategory["accent"], string> = {
  violet: "bg-violet-glow",
  ice: "bg-ice",
  magenta: "bg-magenta-glow",
};

const ACCENT_OPTIONS: Array<{ value: CatalogCategory["accent"]; label: string }> = [
  { value: "violet", label: "Violet" },
  { value: "ice", label: "Ice" },
  { value: "magenta", label: "Magenta" },
];

function TableSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-line">
      <div className="h-11 border-b border-line bg-foreground/[0.02]" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b border-line/60 px-4 py-4 last:border-0">
          <div className="h-4 w-full max-w-sm animate-pulse rounded bg-foreground/[0.05]" />
        </div>
      ))}
    </div>
  );
}

/* -------------------------- category form -------------------------- */

type CategoryFormMode = { kind: "create" } | { kind: "edit"; category: CatalogCategory };

/** Patch shape accepted by PATCH /api/v1/admin/categories/:id (longDescription is nullable). */
type CategoryPatch = Partial<Pick<CatalogCategory, "name" | "description" | "accent" | "featured"> & { longDescription?: string | null }>;

/**
 * Create + edit dialog for categories. Create exposes every column the API
 * accepts (slug is optional and auto-generated when blank); edit shows the
 * slug read-only because slugs are immutable after creation.
 */
function CategoryFormDialog({
  mode,
  open,
  onOpenChange,
  onSaved,
}: {
  mode: CategoryFormMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (saved: { kind: "create"; slug: string } | { kind: "edit"; id: string; patch: CategoryPatch }) => void;
}) {
  const { toast } = useToast();
  const isEdit = mode.kind === "edit";

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [accent, setAccent] = useState<CatalogCategory["accent"]>("violet");
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate the fields from the target row whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    const category = mode.kind === "edit" ? mode.category : null;
    setName(category?.name ?? "");
    setSlug(category?.slug ?? "");
    setDescription(category?.description ?? "");
    setLongDescription(category?.longDescription ?? "");
    setAccent(category?.accent ?? "violet");
    setFeatured(Boolean(category?.featured));
  }, [open, mode]);

  const submit = async () => {
    if (saving || name.trim() === "") return;
    setSaving(true);
    try {
      if (mode.kind === "create") {
        const created = await adminService.createCategory({
          name: name.trim(),
          ...(slug.trim() ? { slug: slug.trim() } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(longDescription.trim() ? { longDescription: longDescription.trim() } : {}),
          accent,
          featured,
        });
        toast({ title: "Category created", description: `${name.trim()} is live at /collections/${created.slug}.` });
        onOpenChange(false);
        onSaved({ kind: "create", slug: created.slug });
      } else {
        const category = mode.category;
        const patch: CategoryPatch = {};
        if (name.trim() !== category.name) patch.name = name.trim();
        if (description.trim() !== category.description) patch.description = description.trim();
        const nextLong = longDescription.trim();
        if (nextLong !== (category.longDescription ?? "")) patch.longDescription = nextLong === "" ? null : nextLong;
        if (accent !== category.accent) patch.accent = accent;
        if (featured !== Boolean(category.featured)) patch.featured = featured;

        if (Object.keys(patch).length > 0) {
          await adminService.updateCategory(category.id, patch);
        }
        toast({ title: "Category updated", description: `${name.trim()} was saved to the taxonomy.` });
        onOpenChange(false);
        onSaved({ kind: "edit", id: category.id, patch });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: isEdit ? "Could not update the category" : "Could not create the category",
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
          <DialogTitle className="font-display">{isEdit ? `Edit ${mode.category.name}` : "Add category"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Edits save to the category record immediately — collection pages reflect them right away."
              : "Creates a real category with a unique slug. Leave the slug blank to auto-generate it from the name."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField label="Name" htmlFor="category-form-name" required className="sm:col-span-2">
            <TextInput id="category-form-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Heat-Not-Burn Sticks" autoComplete="off" />
          </FormField>

          {isEdit ? (
            <FormField label="Slug" htmlFor="category-form-slug" hint="Slugs are permanent — collection links across the storefront point at them." className="sm:col-span-2">
              <TextInput id="category-form-slug" value={slug} readOnly disabled className="font-mono" />
            </FormField>
          ) : (
            <FormField label="Slug (optional)" htmlFor="category-form-slug" hint="Lowercase letters, numbers and dashes. Left blank, it is generated from the name." className="sm:col-span-2">
              <TextInput id="category-form-slug" value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={80} placeholder="e.g. heat-not-burn" className="font-mono" autoComplete="off" />
            </FormField>
          )}

          <FormField label="Description" htmlFor="category-form-description" hint="Shown on the collection tile and cards." className="sm:col-span-2">
            <TextArea id="category-form-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="A short summary of what belongs in this collection…" />
          </FormField>

          <FormField label="Long description" htmlFor="category-form-long-description" hint="Intro paragraph on the collection landing page. Clear it to remove." className="sm:col-span-2">
            <TextArea id="category-form-long-description" rows={4} value={longDescription} onChange={(e) => setLongDescription(e.target.value)} maxLength={2000} placeholder="Optional — a fuller introduction for the /collections page…" />
          </FormField>

          <FormField label="Accent" htmlFor="category-form-accent" hint="Color used for dots, chips and highlights.">
            <Select id="category-form-accent" value={accent} onChange={(e) => setAccent(e.target.value as CatalogCategory["accent"])}>
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
                <p className="text-[0.86rem] font-medium text-foreground">Featured category</p>
                <p className="mt-0.5 text-[0.76rem] leading-relaxed text-muted-foreground">Shown on the homepage collection tiles.</p>
              </div>
              <Switch checked={featured} onCheckedChange={setFeatured} aria-label="Featured category" />
            </div>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || name.trim() === ""}>
              <Plus className="size-4" aria-hidden="true" />
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- view ----------------------------- */

export function CategoriesView() {
  const [categories, setCategories] = useState<CatalogCategory[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<CategoryFormMode>({ kind: "create" });
  const [deleteTarget, setDeleteTarget] = useState<CatalogCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    catalogService
      .categories()
      .then((d) => {
        if (alive) {
          setCategories(d.map((c) => ({ ...c })));
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load categories.");
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

  const openEdit = (row: CatalogCategory) => {
    setFormMode({ kind: "edit", category: row });
    setFormOpen(true);
  };

  const onFormSaved = (saved: { kind: "create"; slug: string } | { kind: "edit"; id: string; patch: CategoryPatch }) => {
    if (saved.kind === "create") {
      setReloadKey((k) => k + 1);
    } else {
      // The API uses null to clear longDescription; the client row type models
      // "cleared" as undefined, so normalise before merging.
      const { longDescription, ...rest } = saved.patch;
      const rowPatch: Partial<CatalogCategory> = longDescription === undefined ? rest : { ...rest, longDescription: longDescription ?? undefined };
      setCategories((prev) => (prev ? prev.map((c) => (c.id === saved.id ? { ...c, ...rowPatch } : c)) : prev));
    }
  };

  /** Optimistic toggle — reverts and toasts when the API rejects it. */
  const onToggleFeatured = async (row: CatalogCategory, next: boolean) => {
    setCategories((prev) => (prev ? prev.map((c) => (c.id === row.id ? { ...c, featured: next } : c)) : prev));
    try {
      await adminService.updateCategory(row.id, { featured: next });
    } catch (error) {
      setCategories((prev) => (prev ? prev.map((c) => (c.id === row.id ? { ...c, featured: row.featured } : c)) : prev));
      toast({
        variant: "destructive",
        title: "Could not update the category",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const onChangeAccent = async (row: CatalogCategory, accent: CatalogCategory["accent"]) => {
    setCategories((prev) => (prev ? prev.map((c) => (c.id === row.id ? { ...c, accent } : c)) : prev));
    try {
      await adminService.updateCategory(row.id, { accent });
    } catch (error) {
      setCategories((prev) => (prev ? prev.map((c) => (c.id === row.id ? { ...c, accent: row.accent } : c)) : prev));
      toast({
        variant: "destructive",
        title: "Could not update the category",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await adminService.deleteCategory(deleteTarget.id);
      toast({ title: "Category deleted", description: `${deleteTarget.name} was removed from the taxonomy.` });
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

  const deleteButton = (row: CatalogCategory) => (
    <button
      type="button"
      onClick={() => setDeleteTarget(row)}
      aria-label={`Delete ${row.name}`}
      className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  );

  const editButton = (row: CatalogCategory) => (
    <button
      type="button"
      onClick={() => openEdit(row)}
      aria-label={`Edit ${row.name}`}
      className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
    >
      <Pencil className="size-4" aria-hidden="true" />
    </button>
  );

  const columns: Column<CatalogCategory>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (row) => row.name,
      cell: (row) => (
        <span className="block">
          <span className="font-medium text-foreground">{row.name}</span>
          <span className="mt-0.5 block max-w-xs truncate text-[0.76rem] text-muted-foreground">{row.description}</span>
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
      key: "itemCount",
      header: "Products",
      sortable: true,
      sortValue: (row) => row.itemCount,
      className: "text-center",
      cell: (row) => <span className="text-muted-foreground">{row.itemCount}</span>,
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
            onChange={(e) => void onChangeAccent(row, e.target.value as CatalogCategory["accent"])}
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
      className: "w-24 text-right",
      cell: (row) => (
        <span className="inline-flex items-center justify-end gap-1">
          {editButton(row)}
          {deleteButton(row)}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-h2 font-bold tracking-tight text-foreground">Categories</h1>
          <p className="mt-1.5 max-w-2xl text-[0.92rem] text-muted-foreground">
            Category taxonomy — names, slugs, product counts, featured flags and accent colors. Featured and accent
            save instantly; full details live in the edit dialog.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" aria-hidden="true" />
          Add category
        </Button>
      </header>

      {error ? (
        <ErrorState body={error} onRetry={retry} />
      ) : loading && !categories ? (
        <TableSkeleton />
      ) : categories && categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories"
          body="No categories in the catalog yet — add the first one to organise products into collections."
          actionLabel="Add category"
          onAction={openCreate}
        />
      ) : categories ? (
        <DataTable
          columns={columns}
          rows={categories}
          initialSort={{ key: "name", dir: "asc" }}
          caption="Catalog categories"
          mobileCard={(row) => (
            <div className="rounded-2xl border border-line bg-elevated/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="font-display text-[0.98rem] font-semibold text-foreground">{row.name}</span>
                <span className={cn("mt-1.5 size-3 shrink-0 rounded-full", ACCENT_DOT[row.accent])} aria-hidden="true" />
              </div>
              <p className="mt-1 font-mono text-[0.76rem] text-muted-foreground">{row.slug}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
                <span className="text-[0.8rem] text-muted-foreground">{row.itemCount} products</span>
                <span className="inline-flex items-center gap-2">
                  <Switch checked={Boolean(row.featured)} onCheckedChange={(v) => void onToggleFeatured(row, v)} aria-label={`Feature ${row.name}`} />
                  {editButton(row)}
                  {deleteButton(row)}
                </span>
              </div>
            </div>
          )}
          emptyMessage="No categories match."
        />
      ) : null}

      <CategoryFormDialog open={formOpen} mode={formMode} onOpenChange={setFormOpen} onSaved={onFormSaved} />

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
              Categories with products still inside cannot be deleted — move those products to another category first.
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
              {deleting ? "Deleting…" : "Delete category"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
