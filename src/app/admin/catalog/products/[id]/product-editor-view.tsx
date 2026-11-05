"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConsolePath } from "@/components/shared/console-path";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { adminService } from "@/services/admin";
import { catalogService } from "@/services/catalog";
import { brandsService } from "@/services/brands";
import { FormSection } from "@/components/shared/admin-primitives";
import { AvailabilityBadge, StatusBadge } from "@/components/shared/status-badge";
import { MediaPicker } from "@/components/admin/media-picker";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { FormField, Select, TextArea, TextInput } from "@/components/forms/fields";
import { COUNTRIES } from "@/data/countries";
import { ORIGIN_LINES } from "@/lib/catalog-origin";
import { useToast } from "@/hooks/use-toast";
import { cn, formatAED } from "@/lib/utils";
import type {
  AdminProductDetail,
  AdminProductDocument,
  AdminProductImage,
  AdminProductPatch,
  AdminProductSpecGroup,
  Availability,
  Brand,
  CatalogCategory,
  ConformityInfo,
} from "@/types";

/* ------------------------------ helpers --------------------------- */

type ConformityStatus = ConformityInfo["status"];

const CONFORMITY_OPTIONS: Array<{ value: ConformityStatus; label: string }> = [
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending" },
  { value: "missing", label: "Missing" },
];

const AVAILABILITY_OPTIONS: Array<{ value: Availability; label: string }> = [
  { value: "in_stock", label: "In stock (derived)" },
  { value: "low_stock", label: "Low stock (derived)" },
  { value: "out_of_stock", label: "Out of stock (derived)" },
  { value: "unavailable", label: "Unavailable (editorial)" },
];

/**
 * Editor working state — variants carry a STRAIGHT (final) price input.
 *
 * The storefront prices any configuration as `base price + Σ price deltas`,
 * so the editor lets the admin type each option's final price and derives
 * the delta (`variant price − base price`) at save time. An EMPTY field
 * means "same as the base price" (delta 0) — those options follow the base
 * when it changes, while a filled field pins that option's price even if
 * the base price moves. This is the "admin sets real prices" mental model
 * while keeping the delta contract intact downstream.
 */
interface VariantRow {
  /** DB id, or a `new_` prefix for rows created in this session (not yet saved). */
  id: string;
  label: string;
  type: AdminProductDetail["variants"][number]["type"];
  swatch: string | null;
  available: boolean;
  /** Final price in AED as typed. Empty = same as the base price (Δ0). */
  priceInput: string;
  /** Per-variant gallery photo (colour/origin imagery). */
  imageMediaId: string | null;
  imageUrl: string | null;
}

interface EditorState {
  name: string;
  model: string;
  tagline: string;
  description: string;
  price: string;
  compare: string;
  categoryId: string;
  brandId: string;
  nicotineStrength: string;
  origin: string;
  keywords: string;
  lowStockThreshold: string;
  featured: boolean;
  isNew: boolean;
  status: "draft" | "published";
  availability: Availability;
  warnings: string[];
  conformity: ConformityInfo[];
  images: AdminProductImage[];
  specGroups: AdminProductSpecGroup[];
  documents: AdminProductDocument[];
  variants: VariantRow[];
  /** Persisted variant ids removed in this session (sent as variantDeletes). */
  deletedVariantIds: string[];
}

function toCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "" || !Number.isFinite(Number(trimmed))) return null;
  return Math.round(Number(trimmed) * 100);
}

function buildState(detail: AdminProductDetail): EditorState {
  return {
    name: detail.name,
    model: detail.model ?? "",
    tagline: detail.tagline,
    description: detail.description,
    price: String(detail.priceCents / 100),
    compare: detail.compareAtCents === null ? "" : String(detail.compareAtCents / 100),
    categoryId: detail.categoryId,
    brandId: detail.brandId,
    nicotineStrength: detail.nicotineStrength ?? "",
    origin: detail.origin ?? "",
    keywords: detail.keywords ?? "",
    lowStockThreshold: String(detail.lowStockThreshold),
    featured: detail.featured,
    isNew: detail.isNew,
    status: detail.published ? "published" : "draft",
    availability: detail.availability,
    warnings: [...detail.warnings],
    conformity: detail.conformity.map((c) => ({ ...c })),
    images: detail.images.map((img) => ({ ...img })),
    specGroups: detail.specGroups.map((g) => ({ ...g, entries: g.entries.map((e) => ({ ...e })) })),
    documents: detail.documents.map((d) => ({ ...d })),
    variants: detail.variants.map((v) => ({
      id: v.id,
      label: v.label,
      type: v.type,
      swatch: v.swatch,
      available: v.available,
      // Δ0 rows render empty — they follow the base price, so a stale
      // number in the input would lie after a base-price change.
      priceInput: v.priceDeltaCents === 0 ? "" : String((detail.priceCents + v.priceDeltaCents) / 100),
      imageMediaId: v.imageMediaId,
      imageUrl: v.imageUrl,
    })),
    deletedVariantIds: [],
  };
}

/* ------------------------------- view ----------------------------- */

export function ProductEditorView({ detail }: { detail: AdminProductDetail }) {
  const basePath = useConsolePath();
  const router = useRouter();
  const { toast } = useToast();

  const [state, setState] = useState<EditorState>(() => buildState(detail));
  const [version, setVersion] = useState(detail.version);
  const [stockInput, setStockInput] = useState("");
  const [qtyOnHand, setQtyOnHand] = useState(detail.qtyOnHand);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const lastSynced = useRef(detail.updatedAt);

  // Hydrate when the server sends fresh data (conflict reload).
  useEffect(() => {
    if (detail.updatedAt === lastSynced.current) return;
    lastSynced.current = detail.updatedAt;
    setState(buildState(detail));
    setVersion(detail.version);
    setQtyOnHand(detail.qtyOnHand);
    setStockInput("");
    setDirty(false);
    setConflict(false);
  }, [detail]);

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

  const patch = (p: Partial<EditorState>) => {
    setState((prev) => ({ ...prev, ...p }));
    setDirty(true);
  };

  const setPrice = (value: string) => {
    setState((prev) => ({ ...prev, price: value }));
    setPriceError(null);
    setDirty(true);
  };

  /* ----------------------------- save ----------------------------- */

  const buildPatch = (): AdminProductPatch | null => {
    if (state.name.trim() === "") {
      toast({ variant: "destructive", title: "Name required", description: "Give the product a name before saving." });
      return null;
    }
    const priceCents = toCents(state.price);
    const compareCents = state.compare.trim() === "" ? null : toCents(state.compare);
    if (priceCents === null || priceCents < 0) {
      setPriceError("Enter a price of 0 or more.");
      return null;
    }
    if (compareCents !== null && compareCents < priceCents) {
      setPriceError("Compare-at price must be greater than or equal to the price.");
      return null;
    }
    const parsedStock = stockInput.trim() === "" ? null : Number(stockInput.trim());
    if (stockInput.trim() !== "" && (!Number.isFinite(parsedStock) || (parsedStock ?? 0) < 0)) {
      toast({ variant: "destructive", title: "Invalid stock", description: "Stock on hand must be a whole number of 0 or more." });
      return null;
    }
    const restockQty = parsedStock === null ? undefined : Math.max(0, Math.round(parsedStock));

    // Variant prices are typed as FINAL prices — anything typed must parse
    // to a non-negative amount; an empty field means "same as base price".
    for (const v of state.variants) {
      if (v.priceInput.trim() === "") continue;
      const cents = toCents(v.priceInput);
      if (cents === null || cents < 0) {
        toast({
          variant: "destructive",
          title: "Invalid variant price",
          description: `Variant ${v.label || "(unnamed)"} needs a valid price of 0 or more, or an empty field to use the base price.`,
        });
        return null;
      }
    }
    // New colour/origin rows must be named before they can be persisted.
    const unnamedDraft = state.variants.find((v) => v.id.startsWith("new_") && v.label.trim() === "");
    if (unnamedDraft) {
      toast({
        variant: "destructive",
        title: "Name every new variant",
        description: `A new ${unnamedDraft.type === "color" ? "colour" : "origin"} is still unnamed — give it a label or remove the row.`,
      });
      return null;
    }

    return {
      name: state.name.trim(),
      model: state.model.trim() || null,
      tagline: state.tagline.trim() || state.name.trim(),
      description: state.description.trim() || "Full description coming soon.",
      priceCents,
      compareAtCents: compareCents,
      featured: state.featured,
      isNew: state.isNew,
      nicotineStrength: state.nicotineStrength.trim() || null,
      origin: state.origin.trim() || null,
      keywords: state.keywords.trim() || null,
      lowStockThreshold: Math.max(0, Math.round(Number(state.lowStockThreshold) || 0)),
      warnings: state.warnings.map((w) => w.trim()).filter(Boolean),
      conformity: state.conformity
        .map((c) => ({ ...c, label: c.label.trim() }))
        .filter((c) => c.label !== "")
        .map((c) => ({
          label: c.label,
          ...(c.detail?.trim() ? { detail: c.detail.trim() } : {}),
          status: c.status,
        })),
      images: state.images.map((img) => ({ id: img.id, mediaAssetId: img.mediaAssetId, url: img.url, alt: img.alt })),
      specGroups: state.specGroups.map((g) => ({
        id: g.id,
        title: g.title.trim() || "Specifications",
        entries: g.entries.map((e) => ({ id: e.id, label: e.label.trim() || "Specification", value: e.value.trim() })),
      })),
      documents: state.documents.map((d) => ({
        id: d.id,
        title: d.title.trim() || "Document",
        type: d.type,
        href: d.href?.trim() || null,
        note: d.note?.trim() || null,
      })),
      variantUpdates: state.variants
        .filter((v) => !v.id.startsWith("new_"))
        .map((v) => {
          const original = detail.variants.find((dv) => dv.id === v.id);
          // delta = final price − base price. Empty input = same as the base
          // price (Δ0) — the option follows future base-price changes.
          const update: NonNullable<AdminProductPatch["variantUpdates"]>[number] = {
            id: v.id,
            available: v.available,
            priceDeltaCents:
              v.priceInput.trim() === "" ? 0 : (toCents(v.priceInput) ?? 0) - (priceCents ?? 0),
          };
          // Swatch/label/photo writes are colour/origin-only — flavour and
          // option rows keep their stored values (their ids live in carts).
          if (v.type === "color" && v.swatch !== (original?.swatch ?? null)) {
            update.swatch = v.swatch;
          }
          if ((v.type === "color" || v.type === "origin") && v.label !== (original?.label ?? v.label)) {
            update.label = v.label.trim() || v.label;
          }
          if (v.imageMediaId !== (original?.imageMediaId ?? null)) {
            update.imageMediaId = v.imageMediaId;
          }
          return update;
        }),
      variantCreates: state.variants
        .filter((v) => v.id.startsWith("new_"))
        .map((v) => ({
          type: v.type as "color" | "origin",
          label: v.label.trim(),
          swatch: v.type === "color" ? v.swatch : null,
          available: v.available,
          // Empty price on a brand-new row = same price as the base product.
          priceDeltaCents:
            v.priceInput.trim() === "" ? 0 : (toCents(v.priceInput) ?? 0) - (priceCents ?? 0),
          imageMediaId: v.imageMediaId,
        })),
      variantDeletes: state.deletedVariantIds.length > 0 ? state.deletedVariantIds : undefined,
      categoryId: state.categoryId,
      brandId: state.brandId,
      publish: state.status === "published",
      ...(state.availability === "unavailable" ? { setOutOfStock: true } : { clearOutOfStock: true }),
      ...(restockQty !== undefined ? { restockQty } : {}),
      expectedVersion: version,
    };
  };

  const onSave = async () => {
    if (saving) return;
    const patchBody = buildPatch();
    if (!patchBody) return;
    setSaving(true);
    try {
      const result = await adminService.updateProduct(detail.id, patchBody);
      setVersion(result.version);
      if (stockInput.trim() !== "") {
        setQtyOnHand(Math.max(0, Math.round(Number(stockInput)) || 0));
        setStockInput("");
      }
      setDirty(false);
      setConflict(false);
      toast({
        title: "Product saved",
        description: `${state.name.trim()} persisted to the catalog — storefront pages and search update immediately.`,
      });
      // New colour/origin rows receive server ids on save — refresh the RSC
      // payload so the editor state (and the tab count) reflects them.
      if ((patchBody.variantCreates?.length ?? 0) > 0 || (patchBody.variantDeletes?.length ?? 0) > 0) {
        router.refresh();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      if (message.toLowerCase().includes("reload")) {
        setConflict(true);
      }
      toast({ variant: "destructive", title: "Save failed", description: message });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await adminService.deleteProduct(detail.id);
      toast({ title: "Product deleted", description: `${detail.name} was removed from the catalog.` });
      router.push(`${basePath}/catalog/products`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      setDeleting(false);
    }
  };

  /* --------------------------- collections ------------------------- */

  const addImages = (assets: Array<{ mediaAssetId: string; url: string; alt: string | null }>) => {
    patch({
      images: [
        ...state.images,
        ...assets.map((a) => ({ id: null as string | null, mediaAssetId: a.mediaAssetId, url: a.url, alt: a.alt })),
      ],
    });
  };
  const moveImage = (index: number, direction: -1 | 1) => {
    const next = [...state.images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patch({ images: next });
  };

  const addWarning = () => patch({ warnings: [...state.warnings, ""] });
  const patchWarning = (index: number, value: string) =>
    patch({ warnings: state.warnings.map((w, i) => (i === index ? value : w)) });
  const removeWarning = (index: number) => patch({ warnings: state.warnings.filter((_, i) => i !== index) });

  const addConformity = () =>
    patch({ conformity: [...state.conformity, { label: "", detail: "", status: "pending" as ConformityStatus }] });
  const patchConformity = (index: number, p: Partial<ConformityInfo>) =>
    patch({ conformity: state.conformity.map((c, i) => (i === index ? { ...c, ...p } : c)) });
  const removeConformity = (index: number) => patch({ conformity: state.conformity.filter((_, i) => i !== index) });

  const addGroup = () =>
    patch({ specGroups: [...state.specGroups, { id: null, title: "New group", entries: [{ id: null, label: "", value: "" }] }] });
  const patchGroup = (gi: number, p: Partial<AdminProductSpecGroup>) =>
    patch({ specGroups: state.specGroups.map((g, i) => (i === gi ? { ...g, ...p } : g)) });
  const removeGroup = (gi: number) => patch({ specGroups: state.specGroups.filter((_, i) => i !== gi) });
  const addEntry = (gi: number) =>
    patch({
      specGroups: state.specGroups.map((g, i) =>
        i === gi ? { ...g, entries: [...g.entries, { id: null, label: "", value: "" }] } : g
      ),
    });
  const patchEntry = (gi: number, ei: number, p: Partial<{ label: string; value: string }>) =>
    patch({
      specGroups: state.specGroups.map((g, i) =>
        i === gi ? { ...g, entries: g.entries.map((e, j) => (j === ei ? { ...e, ...p } : e)) } : g
      ),
    });
  const removeEntry = (gi: number, ei: number) =>
    patch({
      specGroups: state.specGroups.map((g, i) =>
        i === gi ? { ...g, entries: g.entries.filter((_, j) => j !== ei) } : g
      ),
    });

  const addDoc = () =>
    patch({ documents: [...state.documents, { id: null, title: "", type: "pdf" as const, href: null, note: null }] });
  const patchDoc = (index: number, p: Partial<AdminProductDocument>) =>
    patch({ documents: state.documents.map((d, i) => (i === index ? { ...d, ...p } : d)) });
  const removeDoc = (index: number) => patch({ documents: state.documents.filter((_, i) => i !== index) });

  const patchVariant = (id: string, p: Partial<VariantRow>) =>
    patch({ variants: state.variants.map((v) => (v.id === id ? { ...v, ...p } : v)) });

  /** Live "= base ± X" hint for a variant's final-price input. Derived from
   *  the CURRENT base price so re-typing the base re-prices every pinned row
   *  without touching the variant inputs themselves. */
  const priceHintFor = (variant: VariantRow): string | undefined => {
    const baseCents = toCents(state.price);
    if (baseCents === null) return undefined;
    if (variant.priceInput.trim() === "") return "Same as base price";
    const variantCents = toCents(variant.priceInput);
    if (variantCents === null) return undefined;
    const delta = variantCents - baseCents;
    if (delta === 0) return "Same as base price";
    return `= base ${formatAED(baseCents / 100)} ${delta > 0 ? "+" : "−"} ${formatAED(Math.abs(delta) / 100)}`;
  };

  /* --------------------- colour/origin variant editing --------------------- */

  const draftCounter = useRef(0);
  const addVariantRow = (type: "color" | "origin") => {
    draftCounter.current += 1;
    patch({
      variants: [
        ...state.variants,
        {
          id: `new_${Date.now().toString(36)}_${draftCounter.current}`,
          label: "",
          type,
          swatch: type === "color" ? "#7c3aed" : null,
          available: true,
          priceInput: "",
          imageMediaId: null,
          imageUrl: null,
        },
      ],
    });
  };
  const removeVariantRow = (row: VariantRow) => {
    const rest = state.variants.filter((v) => v.id !== row.id);
    if (row.id.startsWith("new_")) {
      patch({ variants: rest });
      return;
    }
    patch({ variants: rest, deletedVariantIds: [...state.deletedVariantIds, row.id] });
  };

  // MediaPicker target: which variant row is currently choosing a photo.
  const [variantImagePickerId, setVariantImagePickerId] = useState<string | null>(null);

  const [thumbsBroken, setThumbsBroken] = useState<Set<string>>(() => new Set());

  const lockedVariants = state.variants.filter(
    (v) => v.type === "flavor" || v.type === "capacity" || v.type === "nicotine"
  );
  const colorVariants = state.variants.filter((v) => v.type === "color");
  const originVariants = state.variants.filter((v) => v.type === "origin");

  /** Shared card for editable colour/origin rows: swatch, name, delta,
   *  availability, photo and removal. Draft rows (new_) highlight until saved. */
  const renderEditableVariant = (variant: VariantRow) => {
    const isDraft = variant.id.startsWith("new_");
    const kind = variant.type === "color" ? "colour" : "origin";
    const thumbBroken = thumbsBroken.has(`${variant.id}-img`);
    return (
      <div
        key={variant.id}
        className={cn(
          "space-y-3 rounded-xl border bg-foreground/[0.02] p-3",
          isDraft ? "border-violet-glow/40" : "border-line",
          !variant.available && "opacity-70"
        )}
      >
        <div className="grid grid-cols-1 items-end gap-2.5 sm:grid-cols-[auto_minmax(0,1fr)_9rem_auto]">
          {variant.type === "color" && (
            <div className="space-y-1">
              <label htmlFor={`${variant.id}-swatch`} className="block text-[0.72rem] font-medium text-muted-foreground">
                Swatch
              </label>
              <input
                id={`${variant.id}-swatch`}
                type="color"
                value={variant.swatch ?? "#7c3aed"}
                onChange={(e) => patchVariant(variant.id, { swatch: e.target.value })}
                className="block h-10 w-14 cursor-pointer rounded-lg border border-line bg-transparent p-1"
                aria-label={`Swatch colour for ${variant.label || "new colour"}`}
              />
            </div>
          )}
          <FormField label={isDraft ? `New ${kind} name` : kind === "colour" ? "Colour name" : "Origin name"} htmlFor={`${variant.id}-label`}>
            <TextInput
              id={`${variant.id}-label`}
              value={variant.label}
              onChange={(e) => patchVariant(variant.id, { label: e.target.value })}
              maxLength={120}
              placeholder={variant.type === "color" ? "e.g. Midnight Blue" : "e.g. Indonesia"}
              list={variant.type === "origin" ? "vap-origin-countries" : undefined}
            />
          </FormField>
          <FormField label="Price (AED)" htmlFor={`${variant.id}-price`} hint={priceHintFor(variant)}>
            <TextInput
              id={`${variant.id}-price`}
              type="number"
              min={0}
              step="0.01"
              placeholder="Base price"
              value={variant.priceInput}
              onChange={(e) => patchVariant(variant.id, { priceInput: e.target.value })}
            />
          </FormField>
          <div className="flex h-11 items-center gap-2">
            <Switch
              checked={variant.available}
              onCheckedChange={(v) => patchVariant(variant.id, { available: v })}
              aria-label={`Availability for ${variant.label || "new variant"}`}
            />
            <span className="text-[0.76rem] text-muted-foreground">{variant.available ? "Available" : "Hidden"}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-line bg-black/30">
            {variant.imageUrl && !thumbBroken ? (
              <img
                src={variant.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                onError={() =>
                  setThumbsBroken((prev) => {
                    if (prev.has(`${variant.id}-img`)) return prev;
                    const next = new Set(prev);
                    next.add(`${variant.id}-img`);
                    return next;
                  })
                }
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImagePlus className="size-4" aria-hidden="true" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[0.8rem] font-medium text-foreground">Variant photo</p>
            <p className="text-[0.72rem] text-muted-foreground">Shown in the storefront gallery when this {kind} is selected.</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setVariantImagePickerId(variant.id)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[0.76rem] font-medium text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
            >
              <ImagePlus className="size-3.5" aria-hidden="true" />
              {variant.imageUrl ? "Change photo" : "Choose photo"}
            </button>
            {variant.imageUrl && (
              <button
                type="button"
                onClick={() => patchVariant(variant.id, { imageMediaId: null, imageUrl: null })}
                aria-label={`Remove photo from ${variant.label || "new variant"}`}
                className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => removeVariantRow(variant)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[0.76rem] font-medium text-muted-foreground transition-colors hover:border-error/50 hover:text-error"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              {isDraft ? `Discard ${kind}` : `Remove ${kind}`}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const categoryLabel = useMemo(
    () => categories.find((c) => c.id === state.categoryId)?.name ?? detail.categoryName,
    [categories, state.categoryId, detail.categoryName]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <header className="space-y-3">
        <Link
          href={basePath + "/catalog/products"}
          className="inline-flex min-h-8 items-center gap-1.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All products
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="font-display text-h2 font-bold tracking-tight text-foreground">{state.name || detail.name}</h1>
          <AvailabilityBadge availability={state.availability} />
          <StatusBadge tone={state.status === "published" ? "success" : "neutral"}>
            {state.status === "published" ? "Published" : "Draft"}
          </StatusBadge>
          {dirty && (
            <span className="inline-flex items-center gap-1.5" title="You have unsaved changes">
              <span className="size-2 rounded-full bg-warning" aria-hidden="true" />
              <span className="text-[0.74rem] font-medium text-warning">Unsaved changes</span>
            </span>
          )}
        </div>
        <p className="max-w-2xl text-[0.82rem] text-muted-foreground">
          Catalog record <code className="font-mono text-[0.76rem]">{detail.id}</code> · SKU{" "}
          <code className="font-mono text-[0.76rem]">{detail.sku}</code> · {categoryLabel} · v{version}
        </p>
      </header>

      {conflict && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-warning/30 bg-warning/[0.07] px-4 py-3">
          <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
          <p className="text-[0.84rem] text-warning">Someone else updated this product — reload to continue.</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="ml-auto inline-flex min-h-9 items-center rounded-full border border-warning/50 px-4 text-[0.8rem] font-medium text-warning transition-colors hover:bg-warning/10"
          >
            Reload
          </button>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left: tabs */}
        <Tabs defaultValue="details">
          <TabsList className="h-auto min-h-9 w-full flex-wrap justify-start">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="variants">Variants ({state.variants.length})</TabsTrigger>
            <TabsTrigger value="specs">Specifications ({state.specGroups.length})</TabsTrigger>
            <TabsTrigger value="images">Images ({state.images.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({state.documents.length})</TabsTrigger>
            <TabsTrigger value="compliance">Warnings &amp; conformity</TabsTrigger>
          </TabsList>

          {/* Details */}
          <TabsContent value="details" className="mt-4">
            <FormSection title="Details" description="Core identity fields shown on the public product page.">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name" htmlFor="p-name" required>
                  <TextInput id="p-name" value={state.name} onChange={(e) => patch({ name: e.target.value })} maxLength={160} />
                </FormField>
                <FormField label="SKU" htmlFor="p-sku" hint="SKU is immutable — it keys inventory and orders.">
                  <TextInput id="p-sku" value={detail.sku} readOnly disabled className="font-mono" />
                </FormField>
                <FormField label="Model" htmlFor="p-model" hint="Optional chassis or model code.">
                  <TextInput id="p-model" value={state.model} onChange={(e) => patch({ model: e.target.value })} maxLength={80} className="font-mono" />
                </FormField>
                <FormField label="Slug" htmlFor="p-slug" hint="Public URL path — generated and unique.">
                  <TextInput id="p-slug" value={detail.slug} readOnly disabled className="font-mono" />
                </FormField>
                <FormField label="Category" htmlFor="p-category" required>
                  <Select id="p-category" value={state.categoryId} onChange={(e) => patch({ categoryId: e.target.value })}>
                    {categories.length === 0 && <option value={state.categoryId}>{detail.categoryName}</option>}
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Brand" htmlFor="p-brand" required>
                  <Select id="p-brand" value={state.brandId} onChange={(e) => patch({ brandId: e.target.value })}>
                    {brands.length === 0 && <option value={state.brandId}>{detail.brandName}</option>}
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Tagline" htmlFor="p-tagline" required className="sm:col-span-2">
                  <TextInput id="p-tagline" value={state.tagline} onChange={(e) => patch({ tagline: e.target.value })} maxLength={240} />
                </FormField>
                <FormField label="Description" htmlFor="p-description" required className="sm:col-span-2">
                  <TextArea id="p-description" rows={5} value={state.description} onChange={(e) => patch({ description: e.target.value })} />
                </FormField>
                <FormField label="Nicotine strength" htmlFor="p-nicotine" hint="e.g. 20 mg/ml — leave blank for devices.">
                  <TextInput id="p-nicotine" value={state.nicotineStrength} onChange={(e) => patch({ nicotineStrength: e.target.value })} maxLength={80} />
                </FormField>
                <FormField
                  label="Origin"
                  htmlFor="p-origin"
                  hint="Sourcing line shown on chips, filters and the /origin pages."
                >
                  <Select
                    id="p-origin"
                    value={ORIGIN_LINES.some((line) => line.dbValue === state.origin) ? state.origin : state.origin ? "__legacy__" : ""}
                    onChange={(e) => {
                      const next = e.target.value;
                      patch({ origin: next === "__legacy__" ? state.origin : next });
                    }}
                  >
                    <option value="">Not specified</option>
                    {ORIGIN_LINES.map((line) => (
                      <option key={line.slug} value={line.dbValue}>
                        {line.flag} {line.label}
                      </option>
                    ))}
                    {/* Legacy free-text origin (pre-dropdown catalog rows) —
                        kept selectable so an accidental re-save never silently
                        rewrites the stored value. */}
                    {state.origin !== "" && !ORIGIN_LINES.some((line) => line.dbValue === state.origin) && (
                      <option value="__legacy__">{state.origin} (custom)</option>
                    )}
                  </Select>
                </FormField>
                <FormField label="Search keywords" htmlFor="p-keywords" hint="Comma-separated terms that feed storefront search." className="sm:col-span-2">
                  <TextInput id="p-keywords" value={state.keywords} onChange={(e) => patch({ keywords: e.target.value })} maxLength={500} />
                </FormField>
              </div>
            </FormSection>
          </TabsContent>

          {/* Variants */}
          <TabsContent value="variants" className="mt-4 space-y-4">
            {/* Locked groups — flavour/capacity/nicotine rows are referenced by
                carts and orders, so they stay UPDATE-only. */}
            <FormSection
              title="Flavours & options (updates only)"
              description="Carts and orders reference these variant ids, so rows cannot be added or removed here — toggle availability and set the final price, then save."
            >
              <div className="space-y-2.5">
                {lockedVariants.length === 0 && (
                  <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[0.84rem] text-muted-foreground">
                    This product has no flavour, option or nicotine variants.
                  </p>
                )}
                {lockedVariants.map((variant) => (
                  <div
                    key={variant.id}
                    className={cn(
                      "grid grid-cols-1 items-end gap-2.5 rounded-xl border border-line bg-foreground/[0.02] p-3 sm:grid-cols-[3rem_minmax(0,1fr)_9rem_9rem_auto]",
                      !variant.available && "opacity-70"
                    )}
                  >
                    <div className="flex h-11 items-center">
                      {variant.swatch ? (
                        <span
                          className="size-7 rounded-full border border-line"
                          style={{ backgroundColor: variant.swatch }}
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="inline-flex size-7 items-center justify-center rounded-full border border-line text-[0.62rem] uppercase text-muted-foreground">
                          {variant.type.slice(0, 3)}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="truncate text-[0.88rem] font-medium text-foreground">{variant.label}</p>
                      <p className="text-[0.72rem] uppercase tracking-[0.1em] text-muted-foreground">{variant.type}</p>
                    </div>
                    <div className="flex h-11 items-center gap-2">
                      <Switch
                        checked={variant.available}
                        onCheckedChange={(v) => patchVariant(variant.id, { available: v })}
                        aria-label={`Availability for ${variant.label}`}
                      />
                      <span className="text-[0.76rem] text-muted-foreground">{variant.available ? "Available" : "Hidden"}</span>
                    </div>
                    <FormField label="Price (AED)" htmlFor={`${variant.id}-price`} hint={priceHintFor(variant)}>
                      <TextInput
                        id={`${variant.id}-price`}
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Base price"
                        value={variant.priceInput}
                        onChange={(e) => patchVariant(variant.id, { priceInput: e.target.value })}
                      />
                    </FormField>
                    <p className="hidden text-[0.72rem] text-muted-foreground sm:block" aria-hidden="true">
                      id <code className="font-mono">{variant.id}</code>
                    </p>
                  </div>
                ))}
              </div>
            </FormSection>

            {/* Colours — full add/edit/delete with swatch + per-colour photo. */}
            <FormSection
              title="Colours"
              description="Add as many colours as the product ships in. Each colour can carry its own photo — the storefront gallery swaps to it when the colour is selected."
              actions={
                <button
                  type="button"
                  onClick={() => addVariantRow("color")}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add colour
                </button>
              }
            >
              <div className="space-y-2.5">
                {colorVariants.length === 0 && (
                  <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[0.84rem] text-muted-foreground">
                    No colours yet — add one for every finish this product comes in.
                  </p>
                )}
                {colorVariants.map(renderEditableVariant)}
              </div>
            </FormSection>

            {/* Origins — selectable countries of manufacture with photos. */}
            <FormSection
              title="Origins"
              description="Where this product is manufactured. Add one origin per country of manufacture — visitors pick an origin and the gallery shows its photo."
              actions={
                <button
                  type="button"
                  onClick={() => addVariantRow("origin")}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add origin
                </button>
              }
            >
              <div className="space-y-2.5">
                {originVariants.length === 0 && (
                  <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[0.84rem] text-muted-foreground">
                    No selectable origins yet — the free-text origin on the Details tab still displays until you add one here.
                  </p>
                )}
                {originVariants.map(renderEditableVariant)}
              </div>
              {/* Country suggestions for origin names — free text still accepted. */}
              <datalist id="vap-origin-countries">
                {COUNTRIES.map((country) => (
                  <option key={country} value={country} />
                ))}
              </datalist>
            </FormSection>

            {/* Shared media picker — one instance serves every variant row. */}
            <MediaPicker
              open={variantImagePickerId !== null}
              onOpenChange={(open) => {
                if (!open) setVariantImagePickerId(null);
              }}
              onSelect={(asset) => {
                if (variantImagePickerId) {
                  patchVariant(variantImagePickerId, { imageMediaId: asset.mediaAssetId, imageUrl: asset.url });
                }
              }}
              title="Variant photo"
              uploadFolder="products"
            />
          </TabsContent>

          {/* Specifications */}
          <TabsContent value="specs" className="mt-4 space-y-4">
            {state.specGroups.map((group, gi) => (
              <FormSection
                key={gi}
                title={`Group ${gi + 1}`}
                actions={
                  <button
                    type="button"
                    onClick={() => removeGroup(gi)}
                    aria-label={`Remove specification group ${gi + 1}`}
                    className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                }
              >
                <div className="space-y-3.5">
                  <FormField label="Group title" htmlFor={`spec-group-${gi}`}>
                    <TextInput
                      id={`spec-group-${gi}`}
                      value={group.title}
                      onChange={(e) => patchGroup(gi, { title: e.target.value })}
                      maxLength={120}
                    />
                  </FormField>
                  <div className="space-y-2.5">
                    {group.entries.map((entry, ei) => (
                      <div key={ei} className="grid grid-cols-1 items-end gap-2.5 rounded-xl border border-line bg-foreground/[0.02] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto]">
                        <FormField label="Label" htmlFor={`spec-${gi}-${ei}-label`}>
                          <TextInput
                            id={`spec-${gi}-${ei}-label`}
                            value={entry.label}
                            onChange={(e) => patchEntry(gi, ei, { label: e.target.value })}
                            maxLength={120}
                            className="h-10"
                          />
                        </FormField>
                        <FormField label="Value" htmlFor={`spec-${gi}-${ei}-value`}>
                          <TextInput
                            id={`spec-${gi}-${ei}-value`}
                            value={entry.value}
                            onChange={(e) => patchEntry(gi, ei, { value: e.target.value })}
                            maxLength={300}
                            className="h-10"
                          />
                        </FormField>
                        <button
                          type="button"
                          onClick={() => removeEntry(gi, ei)}
                          aria-label={`Remove entry ${entry.label || ei + 1}`}
                          className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addEntry(gi)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Add entry
                  </button>
                </div>
              </FormSection>
            ))}
            <button
              type="button"
              onClick={addGroup}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-4 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add specification group
            </button>
          </TabsContent>

          {/* Images */}
          <TabsContent value="images" className="mt-4">
            <FormSection
              title="Images"
              description="Ordered library assets — the first entry is the primary card image. Reorder with the arrows."
              actions={
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
                >
                  <ImagePlus className="size-3.5" aria-hidden="true" />
                  Pick from library
                </button>
              }
            >
              <div className="space-y-2.5">
                {state.images.length === 0 && (
                  <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[0.84rem] text-muted-foreground">
                    No images yet — pick at least one from the media library.
                  </p>
                )}
                {state.images.map((image, i) => (
                  <div key={`${image.mediaAssetId}-${i}`} className="grid grid-cols-1 items-end gap-2.5 rounded-xl border border-line bg-foreground/[0.02] p-3 sm:grid-cols-[4rem_minmax(0,1fr)_auto]">
                    <div className="relative size-16 overflow-hidden rounded-lg border border-line bg-black/30">
                      {thumbsBroken.has(image.mediaAssetId) ? (
                        <span className="flex h-full w-full items-center justify-center text-[0.6rem] text-muted-foreground">broken</span>
                      ) : (
                        <img
                          src={image.url}
                          alt={image.alt ?? `Product image ${i + 1}`}
                          className="h-full w-full object-cover"
                          onError={() =>
                            setThumbsBroken((prev) => {
                              if (prev.has(image.mediaAssetId)) return prev;
                              const next = new Set(prev);
                              next.add(image.mediaAssetId);
                              return next;
                            })
                          }
                        />
                      )}
                    </div>
                    <FormField label={`Image ${i + 1}${i === 0 ? " (primary)" : ""} — alt text`} htmlFor={`img-${i}-alt`}>
                      <TextInput
                        id={`img-${i}-alt`}
                        value={image.alt ?? ""}
                        onChange={(e) =>
                          patch({ images: state.images.map((img, j) => (j === i ? { ...img, alt: e.target.value } : img)) })
                        }
                        maxLength={300}
                        placeholder="Describe the image for assistive tech"
                      />
                    </FormField>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(i, -1)}
                        disabled={i === 0}
                        aria-label={`Move image ${i + 1} up`}
                        className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(i, 1)}
                        disabled={i === state.images.length - 1}
                        aria-label={`Move image ${i + 1} down`}
                        className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => patch({ images: state.images.filter((_, j) => j !== i) })}
                        aria-label={`Remove image ${i + 1}`}
                        className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-[0.76rem] text-muted-foreground">
                  Images always reference uploaded media-library assets — external URLs are not supported, keeping the
                  library the single source of truth.
                </p>
              </div>
            </FormSection>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents" className="mt-4">
            <FormSection
              title="Documents"
              description="PDFs and web references attached to the product page."
              actions={
                <button
                  type="button"
                  onClick={addDoc}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add document
                </button>
              }
            >
              <div className="space-y-2.5">
                {state.documents.length === 0 && (
                  <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[0.84rem] text-muted-foreground">
                    No documents attached.
                  </p>
                )}
                {state.documents.map((doc, i) => (
                  <div key={doc.id ?? `new-${i}`} className="grid grid-cols-1 items-end gap-2.5 rounded-xl border border-line bg-foreground/[0.02] p-3 sm:grid-cols-[minmax(0,1.4fr)_7.5rem_minmax(0,1.4fr)_auto]">
                    <FormField label="Title" htmlFor={`doc-${i}-title`}>
                      <TextInput
                        id={`doc-${i}-title`}
                        value={doc.title}
                        onChange={(e) => patchDoc(i, { title: e.target.value })}
                        maxLength={200}
                        className="h-10"
                      />
                    </FormField>
                    <FormField label="Type" htmlFor={`doc-${i}-type`}>
                      <Select
                        id={`doc-${i}-type`}
                        value={doc.type}
                        onChange={(e) => patchDoc(i, { type: e.target.value as "pdf" | "web" })}
                        className="h-10"
                      >
                        <option value="pdf">PDF</option>
                        <option value="web">Web</option>
                      </Select>
                    </FormField>
                    <FormField label="Link (href)" htmlFor={`doc-${i}-href`}>
                      <TextInput
                        id={`doc-${i}-href`}
                        value={doc.href ?? ""}
                        onChange={(e) => patchDoc(i, { href: e.target.value })}
                        maxLength={600}
                        className="h-10 font-mono text-[0.8rem]"
                        placeholder="/documents/… or https://…"
                      />
                    </FormField>
                    <button
                      type="button"
                      onClick={() => removeDoc(i)}
                      aria-label={`Remove document ${doc.title || i + 1}`}
                      className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                    <FormField label="Note" htmlFor={`doc-${i}-note`} className="sm:col-span-3">
                      <TextInput
                        id={`doc-${i}-note`}
                        value={doc.note ?? ""}
                        onChange={(e) => patchDoc(i, { note: e.target.value })}
                        maxLength={300}
                        className="h-10"
                        placeholder="Optional note shown beside the document"
                      />
                    </FormField>
                  </div>
                ))}
              </div>
            </FormSection>
          </TabsContent>

          {/* Warnings & conformity */}
          <TabsContent value="compliance" className="mt-4 space-y-4">
            <FormSection
              title="Warnings"
              description="Safety lines rendered in the public product safety block."
              actions={
                <button
                  type="button"
                  onClick={addWarning}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add warning
                </button>
              }
            >
              <div className="space-y-2.5">
                {state.warnings.length === 0 && (
                  <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[0.84rem] text-muted-foreground">
                    No warnings — add at least the UAE nicotine warning for restricted products.
                  </p>
                )}
                {state.warnings.map((warning, i) => (
                  <div key={i} className="grid grid-cols-1 items-end gap-2.5 rounded-xl border border-line bg-foreground/[0.02] p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <FormField label={`Warning ${i + 1}`} htmlFor={`warning-${i}`}>
                      <TextInput
                        id={`warning-${i}`}
                        value={warning}
                        onChange={(e) => patchWarning(i, e.target.value)}
                        maxLength={300}
                        className="h-10"
                      />
                    </FormField>
                    <button
                      type="button"
                      onClick={() => removeWarning(i)}
                      aria-label={`Remove warning ${i + 1}`}
                      className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </FormSection>

            <FormSection
              title="Conformity"
              description="Regulatory requirements and their verification state — feeds the public compliance block."
              actions={
                <button
                  type="button"
                  onClick={addConformity}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:border-violet-glow/50 hover:text-foreground"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add requirement
                </button>
              }
            >
              <div className="space-y-2.5">
                {state.conformity.length === 0 && (
                  <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[0.84rem] text-muted-foreground">
                    No conformity entries yet.
                  </p>
                )}
                {state.conformity.map((row, i) => (
                  <div
                    key={`${row.label}-${i}`}
                    className="grid grid-cols-1 items-end gap-2.5 rounded-xl border border-line bg-foreground/[0.02] p-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_9.5rem_auto]"
                  >
                    <FormField label="Requirement" htmlFor={`conf-${i}-label`}>
                      <TextInput
                        id={`conf-${i}-label`}
                        value={row.label}
                        onChange={(e) => patchConformity(i, { label: e.target.value })}
                        maxLength={200}
                        className="h-10"
                      />
                    </FormField>
                    <FormField label="Detail" htmlFor={`conf-${i}-detail`}>
                      <TextInput
                        id={`conf-${i}-detail`}
                        value={row.detail ?? ""}
                        onChange={(e) => patchConformity(i, { detail: e.target.value })}
                        maxLength={500}
                        className="h-10"
                      />
                    </FormField>
                    <FormField label="Status" htmlFor={`conf-${i}-status`}>
                      <Select
                        id={`conf-${i}-status`}
                        value={row.status}
                        onChange={(e) => patchConformity(i, { status: e.target.value as ConformityStatus })}
                        className="h-10"
                      >
                        {CONFORMITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <button
                      type="button"
                      onClick={() => removeConformity(i)}
                      aria-label={`Remove requirement ${row.label || i + 1}`}
                      className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </FormSection>
          </TabsContent>
        </Tabs>

        {/* Right rail */}
        <aside aria-label="Product status controls" className="space-y-4 lg:sticky lg:top-24">
          <section className="space-y-3.5 rounded-2xl border border-line bg-elevated/50 p-5">
            <h2 className="font-display text-[1rem] font-semibold text-foreground">Status</h2>
            <FormField label="Publish status" htmlFor="p-status">
              <Select id="p-status" value={state.status} onChange={(e) => patch({ status: e.target.value as "draft" | "published" })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </FormField>
            <StatusBadge tone={state.status === "published" ? "success" : "neutral"}>
              {state.status === "published" ? "Published" : "Draft"}
            </StatusBadge>
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-[filter] hover:brightness-110 disabled:opacity-60"
            >
              <Save className="size-4" aria-hidden="true" />
              {saving ? "Saving…" : "Save"}
            </button>
            <p className="text-[0.74rem] leading-relaxed text-muted-foreground">
              Saving persists every tab, bumps the record version and reindexes storefront search.
            </p>
          </section>

          <section className="space-y-3.5 rounded-2xl border border-line bg-elevated/50 p-5">
            <h2 className="font-display text-[1rem] font-semibold text-foreground">Pricing &amp; flags</h2>
            <FormField
              label="Price (AED)"
              htmlFor="p-price"
              error={priceError ?? undefined}
              hint="Base price of the default configuration. Options on the Variants tab set their own final price."
            >
              <TextInput
                id="p-price"
                type="number"
                min={0}
                step="0.01"
                value={state.price}
                onChange={(e) => setPrice(e.target.value)}
                invalid={priceError !== null}
              />
            </FormField>
            <FormField label="Compare-at price (AED)" htmlFor="p-compare" hint="Leave blank for no strikethrough “was” price.">
              <TextInput
                id="p-compare"
                type="number"
                min={0}
                step="0.01"
                value={state.compare}
                onChange={(e) => {
                  patch({ compare: e.target.value });
                  setPriceError(null);
                }}
              />
            </FormField>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.84rem] font-medium text-foreground">Featured</span>
              <Switch checked={state.featured} onCheckedChange={(v) => patch({ featured: v })} aria-label="Featured on storefront" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.84rem] font-medium text-foreground">New</span>
              <Switch checked={state.isNew} onCheckedChange={(v) => patch({ isNew: v })} aria-label="New badge on storefront" />
            </div>
            <FormField label="Low stock threshold" htmlFor="p-low-stock" hint="At or below this on-hand qty the badge turns “Low stock”.">
              <TextInput
                id="p-low-stock"
                type="number"
                min={0}
                step={1}
                value={state.lowStockThreshold}
                onChange={(e) => patch({ lowStockThreshold: e.target.value })}
              />
            </FormField>
          </section>

          <section className="space-y-3.5 rounded-2xl border border-line bg-elevated/50 p-5">
            <h2 className="font-display text-[1rem] font-semibold text-foreground">Availability &amp; stock</h2>
            <FormField label="Storefront availability" htmlFor="p-availability" hint="Only “Unavailable” is editorial — other states derive from stock on hand.">
              <Select
                id="p-availability"
                value={state.availability}
                onChange={(e) => patch({ availability: e.target.value as Availability })}
              >
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Stock on hand" htmlFor="p-stock" hint={`Currently ${qtyOnHand} units (product-level). Saving sets the absolute value.`}>
              <TextInput
                id="p-stock"
                type="number"
                min={0}
                step={1}
                value={stockInput}
                onChange={(e) => setStockInput(e.target.value)}
                placeholder={String(qtyOnHand)}
              />
            </FormField>
            <div>
              <p className="mb-1.5 text-[0.74rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Badge preview</p>
              <AvailabilityBadge availability={state.availability} />
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-error/30 bg-error/[0.04] p-5">
            <h2 className="font-display text-[1rem] font-semibold text-error">Danger zone</h2>
            <p className="text-[0.8rem] leading-relaxed text-muted-foreground">
              Deletes the product, its variants, images, specs and documents. Products referenced by orders or saved
              items cannot be deleted — unpublish those instead.
            </p>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-error/40 text-sm font-medium text-error transition-colors hover:bg-error/10"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete product
            </button>
          </section>
        </aside>
      </div>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(asset) => addImages([asset])}
        title="Pick product images"
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{detail.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the product from the catalog — including its variants, images, specs and
              documents. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void onDelete();
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
