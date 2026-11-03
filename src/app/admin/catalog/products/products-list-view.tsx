"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConsolePath } from "@/components/shared/console-path";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { adminService } from "@/services/admin";
import { catalogService } from "@/services/catalog";
import { brandsService } from "@/services/brands";
import { DataTable, FilterBar, Pagination, SearchField, type Column } from "@/components/shared/admin-primitives";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { FormField, Select, TextInput } from "@/components/forms/fields";
import { ORIGIN_LINES } from "@/lib/catalog-origin";
import { useToast } from "@/hooks/use-toast";
import { formatAED } from "@/lib/utils";
import type { AdminProductSummary, Brand, CatalogCategory } from "@/types";

/* ------------------------------ helpers --------------------------- */

type StatusFilter = "all" | "published" | "draft";

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
];

const PAGE_SIZE = 24;

function statusBadge(product: AdminProductSummary) {
  return product.published ? (
    <StatusBadge tone="success">Published</StatusBadge>
  ) : (
    <StatusBadge tone="neutral">Draft</StatusBadge>
  );
}

/** "🇯🇵 Japan" for known sourcing lines — falls back to the raw db value. */
function originLabel(origin: string | null): string {
  if (!origin) return "";
  const line = ORIGIN_LINES.find((l) => l.dbValue === origin);
  return line ? `${line.flag} ${line.label}` : origin;
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

/* --------------------------- create dialog ------------------------- */

function CreateProductDialog({
  open,
  onOpenChange,
  categories,
  brands,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CatalogCategory[];
  brands: Brand[];
  onCreated: () => void;
}) {
  const basePath = useConsolePath();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [origin, setOrigin] = useState("");
  const [tagline, setTagline] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setSku("");
    setPrice("");
    setTagline("");
    setOrigin("");
    setBrandId(brands[0]?.id ?? "");
    setCategoryId(categories[0]?.id ?? "");
  }, [open, brands, categories]);

  const priceCents = Math.round(Number(price) * 100);
  const valid =
    name.trim().length > 0 &&
    sku.trim().length > 0 &&
    price.trim() !== "" &&
    Number.isFinite(priceCents) &&
    priceCents >= 0 &&
    brandId !== "" &&
    categoryId !== "";

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const created = await adminService.createProduct({
        name: name.trim(),
        sku: sku.trim(),
        categoryId,
        brandId,
        priceCents,
        ...(origin ? { origin } : {}),
        ...(tagline.trim() ? { tagline: tagline.trim() } : {}),
      });
      toast({ title: "Draft created", description: `${name.trim()} is saved as a draft — finish the listing in the editor.` });
      onOpenChange(false);
      onCreated();
      router.push(`${basePath}/catalog/products/${created.id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not create the product",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">New product</DialogTitle>
          <DialogDescription>
            Creates an unpublished draft with zero stock — pricing, images, variants and publish state are edited next.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField label="Name" htmlFor="new-product-name" required className="sm:col-span-2">
            <TextInput id="new-product-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="e.g. Zephyr Shortfill 60" />
          </FormField>
          <FormField label="SKU" htmlFor="new-product-sku" required>
            <TextInput id="new-product-sku" value={sku} onChange={(e) => setSku(e.target.value)} maxLength={64} placeholder="ZEPH-60-000" className="font-mono" />
          </FormField>
          <FormField label="Price (AED)" htmlFor="new-product-price" required>
            <TextInput
              id="new-product-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="60"
            />
          </FormField>
          <FormField label="Brand" htmlFor="new-product-brand" required>
            <Select id="new-product-brand" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="" disabled>
                Select a brand…
              </option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Category" htmlFor="new-product-category" required>
            <Select id="new-product-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="" disabled>
                Select a category…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Origin"
            htmlFor="new-product-origin"
            hint="Sourcing line — chips, filters and /origin pages."
            className="sm:col-span-2"
          >
            <Select id="new-product-origin" value={origin} onChange={(e) => setOrigin(e.target.value)}>
              <option value="">Not specified</option>
              {ORIGIN_LINES.map((line) => (
                <option key={line.slug} value={line.dbValue}>
                  {line.flag} {line.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Tagline (optional)" htmlFor="new-product-tagline" className="sm:col-span-2">
            <TextInput id="new-product-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={240} placeholder="Short LED-chip line for cards" />
          </FormField>
          <DialogFooter className="sm:col-span-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid || saving}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
            >
              <Plus className="size-4" aria-hidden="true" />
              {saving ? "Creating…" : "Create draft"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- view ----------------------------- */

export function ProductsListView() {
  const basePath = useConsolePath();
  const router = useRouter();
  const { toast } = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<AdminProductSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminProductSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce the search field (350 ms) before it hits the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let alive = true;
    catalogService
      .categories()
      .then((d) => alive && setCategories(d))
      .catch(() => undefined);
    brandsService
      .brands()
      .then((d) => alive && setBrands(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Clamp the requested page into the live range so deleting the last row of
  // the last page lands on the new final page instead of a stale empty one.
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminService
      .products({ q: query || undefined, status, page: safePage, pageSize: PAGE_SIZE })
      .then((data) => {
        if (!alive) return;
        setResult(data.items);
        setTotal(data.total);
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load products.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [query, status, safePage, reloadKey]);

  const hasFilters = query !== "" || status !== "all";

  const retry = () => {
    setError(null);
    setReloadKey((k) => k + 1);
  };
  const clearFilters = () => {
    setSearchInput("");
    setQuery("");
    setStatus("all");
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await adminService.deleteProduct(deleteTarget.id);
      toast({ title: "Product deleted", description: `${deleteTarget.name} was removed from the catalog.` });
      setDeleteTarget(null);
      // One row left the current filter set — if this page would now sit past
      // the final page, fall back to the clamped page so the view stays live.
      const remaining = Math.max(0, total - 1);
      const nextPageCount = Math.max(1, Math.ceil(remaining / PAGE_SIZE));
      setPage((prev) => Math.min(prev, nextPageCount));
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

  const columns: Column<AdminProductSummary>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Product",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <span className="block">
            <Link
              href={`${basePath}/catalog/products/${row.id}`}
              className="font-medium text-foreground transition-colors hover:text-violet-soft"
            >
              {row.name}
            </Link>
            <span className="mt-0.5 block max-w-xs truncate text-[0.74rem] text-muted-foreground">
              {row.brandName} · {row.categoryName}
            </span>
          </span>
        ),
      },
      {
        key: "sku",
        header: "SKU",
        sortable: true,
        sortValue: (row) => row.sku,
        cell: (row) => <code className="font-mono text-[0.76rem] text-muted-foreground">{row.sku}</code>,
      },
      {
        key: "origin",
        header: "Origin",
        cell: (row) => {
          if (!row.origin) return <span className="text-muted-foreground/50">—</span>;
          const line = ORIGIN_LINES.find((l) => l.dbValue === row.origin);
          return (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.8rem] text-muted-foreground">
              {line && (
                <span aria-hidden="true" className="text-[0.9rem] leading-none">
                  {line.flag}
                </span>
              )}
              {line ? line.label : row.origin}
            </span>
          );
        },
      },
      {
        key: "price",
        header: "Price",
        sortable: true,
        sortValue: (row) => row.priceCents,
        cell: (row) => (
          <span className="whitespace-nowrap font-medium text-foreground">{formatAED(row.priceCents / 100)}</span>
        ),
      },
      {
        key: "stock",
        header: "Stock",
        sortable: true,
        sortValue: (row) => row.qtyOnHand,
        className: "text-center",
        cell: (row) => (
          <span className={row.qtyOnHand <= 0 ? "text-warning" : "text-muted-foreground"}>{row.qtyOnHand}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: statusBadge,
      },
      {
        key: "actions",
        header: "",
        className: "w-20 text-right",
        cell: (row) => (
          <span className="inline-flex items-center justify-end gap-1">
            <Link
              href={`${basePath}/catalog/products/${row.id}`}
              aria-label={`Edit ${row.name}`}
              className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              aria-label={`Delete ${row.name}`}
              className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </span>
        ),
      },
    ],
    []
  );

  const mobileCard = (row: AdminProductSummary) => (
    <div className="rounded-2xl border border-line bg-elevated/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={`${basePath}/catalog/products/${row.id}`} className="font-display text-[0.98rem] font-semibold text-foreground">
          {row.name}
        </Link>
        {statusBadge(row)}
      </div>
      <p className="mt-1 font-mono text-[0.74rem] text-muted-foreground">{row.sku}</p>
      {row.origin && <p className="mt-0.5 text-[0.74rem] text-muted-foreground">{originLabel(row.origin)}</p>}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line/60 pt-3 text-[0.8rem] text-muted-foreground">
        <span>
          {formatAED(row.priceCents / 100)} · {row.qtyOnHand} in stock
        </span>
        <span className="inline-flex items-center gap-2">
          <Link href={`${basePath}/catalog/products/${row.id}`} aria-label={`Edit ${row.name}`} className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
            <Pencil className="size-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.name}`}
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-error/10 hover:text-error"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </span>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-violet-soft">Catalog</p>
          <h1 className="mt-1 font-display text-h2 font-bold tracking-tight text-foreground">Products</h1>
          <p className="mt-1.5 max-w-2xl text-[0.92rem] text-muted-foreground">
            Every catalog record — drafts included — with pricing, stock and publish state.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add product
        </button>
      </header>

      <div className="space-y-3">
        <SearchField
          value={searchInput}
          onChange={setSearchInput}
          label="Search products by name or SKU"
          placeholder="Search name or SKU…"
          className="w-full lg:w-80"
        />
        <FilterBar
          options={STATUS_OPTIONS}
          value={status}
          onChange={(next) => {
            setStatus(next as StatusFilter);
            setPage(1);
          }}
          ariaLabel="Filter products by publish status"
        />
      </div>

      {error ? (
        <ErrorState body={error} onRetry={retry} />
      ) : loading && !result ? (
        <TableSkeleton />
      ) : result && result.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasFilters ? "No products match" : "No products yet"}
          body={
            hasFilters
              ? "Try a different search or status filter."
              : "Create your first draft product — it stays hidden until you publish it."
          }
          {...(hasFilters
            ? { actionLabel: "Clear filters", onAction: clearFilters }
            : { actionLabel: "Add product", onAction: () => setCreateOpen(true) })}
        />
      ) : result ? (
        <>
          <DataTable
            columns={columns}
            rows={result}
            initialSort={{ key: "name", dir: "asc" }}
            caption="Catalog products (drafts and published)"
            mobileCard={mobileCard}
            emptyMessage="No products match the current filters."
          />
          <div className="flex flex-col items-center gap-3">
            <Pagination page={safePage} pageCount={pageCount} onChange={setPage} ariaLabel="Product list pages" />
            <p className="text-[0.78rem] text-muted-foreground">
              Showing {result.length} of {total} product{total === 1 ? "" : "s"}
              {hasFilters ? " (filtered)" : ""}.
            </p>
          </div>
        </>
      ) : null}

      <CreateProductDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categories}
        brands={brands}
        onCreated={() => setReloadKey((k) => k + 1)}
      />

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
              This permanently removes the product, its variants, images, specs and documents from the catalog.
              Products referenced by orders or saved items cannot be deleted — unpublish those instead.
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
              {deleting ? "Deleting…" : "Delete product"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
