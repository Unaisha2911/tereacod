"use client";

import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  CloudCog,
  Database,
  FileCheck2,
  KeyRound,
  MessageCircle,
  Save,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import type { SiteSettings } from "@/types";
import { FormSection } from "@/components/shared/admin-primitives";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { FormField, Select, TextArea, TextInput } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface DeliveryFees {
  freeThreshold: number;
  standardFee: number;
  expressFee: number;
}

interface FeatureFlags {
  maintenance: boolean;
  checkoutEnabled: boolean;
}

interface Integration {
  id: string;
  name: string;
  detail: string;
  status: "not_connected" | "pending_vendor" | "out_of_scope" | "verified";
  statusLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const INTEGRATIONS: Integration[] = [
  { id: "d1", name: "Cloudflare D1", detail: "Primary relational store for catalog, orders, accounts and audit.", status: "verified" as const, statusLabel: "Connected", icon: Database },
  { id: "r2", name: "R2 media", detail: "Object storage for imagery and documents (local uploads until deploy).", status: "pending_vendor" as const, statusLabel: "Local mode", icon: CloudCog },
  { id: "kv", name: "KV config", detail: "Runtime site configuration, delivery fees and feature flags.", status: "verified" as const, statusLabel: "Connected", icon: KeyRound },
  { id: "auth", name: "Auth & sessions", detail: "Customer and admin identity with PBKDF2 password hashing.", status: "verified" as const, statusLabel: "Connected", icon: ShieldAlert },
  { id: "age", name: "Age verification", detail: "Third-party age checks at purchase and delivery.", status: "pending_vendor", statusLabel: "Pending vendor", icon: FileCheck2 },
  { id: "whatsapp", name: "WhatsApp commerce", detail: "Conversational ordering via wa.me deep links — live on cart, checkout and order confirmations.", status: "verified" as const, statusLabel: "Live", icon: MessageCircle },
];

/** Coerce a free-text AED amount into a safe non-negative number. */
function aedAmount(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

/** Fee inputs keep raw text so a blank field can mean “keep the stored value”. */
interface FeeDrafts {
  freeThreshold: string;
  standardFee: string;
  expressFee: string;
}

/** Structural subset of SiteSettings the editor binds to. */
interface SiteFieldSource {
  brandName: string;
  brandLegalName: string;
  tagline: string;
  description: string;
  locale: string;
  currency: string;
  contact: { email: string; supportEmail: string; phone: string; addressLines: string[]; hours: string };
  seo: { titleTemplate: string; defaultDescription: string };
}

/**
 * Flatten every editable field into one comparable snapshot — the dirtiness
 * baseline for the hydration effect (order must stay stable).
 */
function snapshot(site: SiteFieldSource, fees: FeeDrafts, features: FeatureFlags): Array<string | boolean> {
  return [
    site.brandName,
    site.brandLegalName,
    site.tagline,
    site.description,
    site.locale,
    site.currency,
    site.contact.email,
    site.contact.supportEmail,
    site.contact.phone,
    site.contact.addressLines.join("\n"),
    site.contact.hours,
    site.seo.titleTemplate,
    site.seo.defaultDescription,
    fees.freeThreshold,
    fees.standardFee,
    fees.expressFee,
    features.maintenance,
    features.checkoutEnabled,
  ];
}

export function SettingsView({ settings }: { settings: SiteSettings }) {
  const { toast } = useToast();

  // Site identity — seeded from the server render, reconciled with the API.
  const [brandName, setBrandName] = useState(settings.brandName);
  const [legalName, setLegalName] = useState(settings.brandLegalName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [description, setDescription] = useState(settings.description);
  const [locale, setLocale] = useState(settings.locale);
  const [currency, setCurrency] = useState(settings.currency);
  const [email, setEmail] = useState(settings.contact.email);
  const [supportEmail, setSupportEmail] = useState(settings.contact.supportEmail);
  const [phone, setPhone] = useState(settings.contact.phone);
  const [address, setAddress] = useState(settings.contact.addressLines.join("\n"));
  const [hours, setHours] = useState(settings.contact.hours);
  const [titleTemplate, setTitleTemplate] = useState(settings.seo.titleTemplate);
  const [defaultDescription, setDefaultDescription] = useState(settings.seo.defaultDescription);

  // Delivery & pricing (AED) + feature flags — hydrated from the settings API.
  const [fees, setFees] = useState<FeeDrafts>({ freeThreshold: "200", standardFee: "25", expressFee: "35" });
  const [features, setFeatures] = useState<FeatureFlags>({ maintenance: false, checkoutEnabled: true });
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Latest-values ref + dirtiness baseline: a slow GET (or a manual retry)
  // must never clobber in-flight edits, so hydration is skipped while dirty.
  const valuesRef = useRef<Array<string | boolean>>(
    snapshot(settings, { freeThreshold: "200", standardFee: "25", expressFee: "35" }, { maintenance: false, checkoutEnabled: true })
  );
  const baselineRef = useRef<Array<string | boolean>>(valuesRef.current);

  useEffect(() => {
    valuesRef.current = snapshot(
      {
        brandName,
        brandLegalName: legalName,
        tagline,
        description,
        locale,
        currency,
        contact: { email, supportEmail, phone, addressLines: address.split("\n"), hours },
        seo: { titleTemplate, defaultDescription },
      },
      fees,
      features
    );
  });

  useEffect(() => {
    // Form is dirty — the user is editing; do not overwrite with server state.
    const base = baselineRef.current;
    if (valuesRef.current.some((value, i) => value !== base[i])) return;
    let alive = true;
    setLoadError(null);
    fetch("/api/v1/admin/settings", { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        const body = (await response.json()) as {
          data: { site: SiteSettings; delivery: DeliveryFees; features: FeatureFlags };
        };
        if (!alive) return;
        const feeDrafts: FeeDrafts = {
          freeThreshold: String(body.data.delivery.freeThreshold),
          standardFee: String(body.data.delivery.standardFee),
          expressFee: String(body.data.delivery.expressFee),
        };
        setFees(feeDrafts);
        setFeatures(body.data.features);
        // Reconcile: the KV document is the source of truth for site fields too.
        const site = body.data.site;
        setBrandName(site.brandName);
        setLegalName(site.brandLegalName);
        setTagline(site.tagline);
        setDescription(site.description);
        setLocale(site.locale);
        setCurrency(site.currency);
        setEmail(site.contact.email);
        setSupportEmail(site.contact.supportEmail);
        setPhone(site.contact.phone);
        setAddress(site.contact.addressLines.join("\n"));
        setHours(site.contact.hours);
        setTitleTemplate(site.seo.titleTemplate);
        setDefaultDescription(site.seo.defaultDescription);
        // The hydrated values become the new dirtiness baseline.
        baselineRef.current = snapshot(site, feeDrafts, body.data.features);
      })
      .catch(() => {
        if (alive) setLoadError("Could not load the live configuration — showing the server-rendered values with default delivery fees and flags.");
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const onSave = async () => {
    setSaving(true);
    try {
      // Blank fee fields mean “keep the stored value” — skip them in the PATCH
      // (the server falls back to the existing config) instead of writing 0.
      const delivery: Partial<DeliveryFees> = {};
      if (fees.freeThreshold.trim() !== "") delivery.freeThreshold = aedAmount(fees.freeThreshold);
      if (fees.standardFee.trim() !== "") delivery.standardFee = aedAmount(fees.standardFee);
      if (fees.expressFee.trim() !== "") delivery.expressFee = aedAmount(fees.expressFee);
      const response = await fetch("/api/v1/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: {
            name: brandName,
            tagline,
            description,
            contact: { email, supportEmail, phone, hours },
          },
          legal: { name: legalName },
          locale,
          currency,
          address,
          seo: { titleTemplate, defaultDescription },
          features,
          ...(Object.keys(delivery).length > 0 ? { delivery } : {}),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Save failed");
      }
      // Saved state is the new baseline — nothing in-flight to protect.
      baselineRef.current = valuesRef.current.slice();
      toast({
        title: "Settings saved",
        description: "Every panel is live — site config, delivery fees and feature flags are stored with revision history.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-violet-soft">System</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Settings</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Site-wide configuration. Saving writes every panel — site identity, contact, SEO, delivery pricing and
          feature flags — to the versioned configuration store in one request.
        </p>
      </header>

      <PrototypeNotice>
        One Save writes the full edited set via PATCH — site config and delivery fees carry revision history; feature
        flags apply to the storefront immediately.
      </PrototypeNotice>

      {loadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/[0.06] px-4 py-3.5">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-[0.84rem] text-foreground">{loadError}</p>
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="mt-1 text-[0.78rem] font-medium text-violet-soft underline-offset-4 hover:underline"
            >
              Retry loading the live configuration
            </button>
          </div>
        </div>
      )}

      {/* Brand identity */}
      <FormSection title="Brand identity" description="Names, tagline and storefront description used across the public site.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Brand name" htmlFor="settings-brand">
            <TextInput id="settings-brand" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          </FormField>
          <FormField label="Legal entity name" htmlFor="settings-legal-name">
            <TextInput id="settings-legal-name" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          </FormField>
          <FormField label="Tagline" htmlFor="settings-tagline" className="sm:col-span-2">
            <TextInput id="settings-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </FormField>
          <FormField label="Storefront description" htmlFor="settings-description" className="sm:col-span-2" hint="Used in metadata and the homepage intro.">
            <TextArea id="settings-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
        </div>
      </FormSection>

      {/* Locale & currency */}
      <FormSection title="Locale & currency" description="Defaults for the public storefront.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Locale" htmlFor="settings-locale">
            <Select id="settings-locale" value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="en-AE">English (UAE) — en-AE</option>
              <option value="ar-AE">العربية (الإمارات) — ar-AE</option>
            </Select>
          </FormField>
          <FormField label="Currency" htmlFor="settings-currency">
            <Select id="settings-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="AED">AED — UAE dirham</option>
              <option value="USD">USD — US dollar</option>
              <option value="SAR">SAR — Saudi riyal</option>
            </Select>
          </FormField>
        </div>
      </FormSection>

      {/* Public contact details */}
      <FormSection title="Public contact details" description="Rendered in the site footer and support pages.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="General email" htmlFor="settings-email">
            <TextInput id="settings-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Support email" htmlFor="settings-support-email">
            <TextInput id="settings-support-email" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
          </FormField>
          <FormField label="Phone" htmlFor="settings-phone">
            <TextInput id="settings-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
          <FormField label="Opening hours" htmlFor="settings-hours">
            <TextInput id="settings-hours" value={hours} onChange={(e) => setHours(e.target.value)} />
          </FormField>
          <FormField label="Address" htmlFor="settings-address" className="sm:col-span-2" hint="One line per row.">
            <TextArea id="settings-address" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
          </FormField>
        </div>
      </FormSection>

      {/* SEO defaults */}
      <FormSection title="SEO defaults" description="Applied when a page does not define its own metadata.">
        <div className="space-y-4">
          <FormField label="Title template" htmlFor="settings-seo-title" hint="%s is replaced by the page title.">
            <TextInput id="settings-seo-title" value={titleTemplate} onChange={(e) => setTitleTemplate(e.target.value)} />
          </FormField>
          <FormField label="Default description" htmlFor="settings-seo-description">
            <TextArea id="settings-seo-description" rows={3} value={defaultDescription} onChange={(e) => setDefaultDescription(e.target.value)} />
          </FormField>
        </div>
      </FormSection>

      {/* Delivery & pricing */}
      <FormSection
        title="Delivery & pricing"
        description="Fees in AED — applied at checkout. Orders at or above the free-delivery threshold ship free."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            label="Free-delivery threshold (AED)"
            htmlFor="delivery-threshold"
            hint="Leave blank to keep the stored value."
          >
            <TextInput
              id="delivery-threshold"
              type="number"
              min={0}
              step={1}
              inputMode="decimal"
              value={fees.freeThreshold}
              onChange={(e) => setFees((f) => ({ ...f, freeThreshold: e.target.value }))}
            />
          </FormField>
          <FormField label="Standard fee (AED)" htmlFor="delivery-standard" hint="Leave blank to keep the stored value.">
            <TextInput
              id="delivery-standard"
              type="number"
              min={0}
              step={1}
              inputMode="decimal"
              value={fees.standardFee}
              onChange={(e) => setFees((f) => ({ ...f, standardFee: e.target.value }))}
            />
          </FormField>
          <FormField label="Express fee (AED)" htmlFor="delivery-express" hint="Leave blank to keep the stored value.">
            <TextInput
              id="delivery-express"
              type="number"
              min={0}
              step={1}
              inputMode="decimal"
              value={fees.expressFee}
              onChange={(e) => setFees((f) => ({ ...f, expressFee: e.target.value }))}
            />
          </FormField>
        </div>
        <p className="mt-3 text-[0.75rem] text-muted-foreground">
          Stored in fils (1 AED = 100 fils) — checkout quotes live from these values.
        </p>
      </FormSection>

      {/* Feature flags */}
      <FormSection title="Feature flags" description="Storefront switches — saved with the next Save and enforced by the API.">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-foreground/[0.02] px-4 py-3.5">
            <div>
              <p className="text-[0.88rem] font-medium text-foreground">Maintenance mode</p>
              <p className="mt-0.5 text-[0.78rem] text-muted-foreground">
                Replaces the public site with the maintenance page for non-staff visitors. The admin console stays
                reachable for staff sessions.
              </p>
            </div>
            <Switch
              checked={features.maintenance}
              onCheckedChange={(checked) => setFeatures((f) => ({ ...f, maintenance: checked }))}
              aria-label="Maintenance mode"
            />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-foreground/[0.02] px-4 py-3.5">
            <div>
              <p className="text-[0.88rem] font-medium text-foreground">Checkout enabled</p>
              <p className="mt-0.5 text-[0.78rem] text-muted-foreground">
                When disabled, order placement returns 503 and the storefront shows checkout as paused. Browsing,
                carts and saved items keep working.
              </p>
            </div>
            <Switch
              checked={features.checkoutEnabled}
              onCheckedChange={(checked) => setFeatures((f) => ({ ...f, checkoutEnabled: checked }))}
              aria-label="Checkout enabled"
            />
          </div>
        </div>
      </FormSection>

      {/* Integration status */}
      <FormSection
        title="Integration status"
        description="Live backend services powering this console (D1, KV and auth are connected; media moves to R2 at deploy)."
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {INTEGRATIONS.map((integration) => {
            const tone =
              integration.status === "verified"
                ? { border: "border-success/30", text: "text-success", dot: "bg-success" }
                : integration.status === "pending_vendor"
                  ? { border: "border-warning/30", text: "text-warning", dot: "bg-warning" }
                  : integration.status === "out_of_scope"
                    ? { border: "border-line", text: "text-muted-foreground", dot: "bg-muted-foreground" }
                    : { border: "border-line", text: "text-muted-foreground", dot: "bg-line-strong" };
            return (
              <li key={integration.id} className={`rounded-2xl border ${tone.border} bg-foreground/[0.02] p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-elevated/60">
                      <integration.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[0.88rem] font-medium text-foreground">{integration.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[0.76rem] text-muted-foreground">
                        <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
                        <span className={tone.text}>{integration.statusLabel}</span>
                      </p>
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0} className="inline-flex rounded-lg">
                        <Button variant="outline" size="sm" disabled>
                          Configure
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Secrets are never edited in-app</TooltipContent>
                  </Tooltip>
                </div>
                <p className="mt-3 border-t border-line pt-2.5 text-[0.78rem] leading-relaxed text-muted-foreground">
                  {integration.detail}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-elevated/40 px-4 py-3.5">
          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-violet-soft" aria-hidden="true" />
          <p className="text-[0.84rem] leading-relaxed text-foreground">
            Secrets are managed via Workers Secrets — never exposed in this console.
          </p>
        </div>
      </FormSection>

      {/* Save */}
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={() => void onSave()} disabled={saving}>
          <Save className="size-4" aria-hidden="true" />
          {saving ? "Saving…" : "Save settings"}
        </Button>
        <p className="text-[0.78rem] text-muted-foreground">
          Saving writes the full edited set to the versioned configuration store — every save is captured in revision
          history.
        </p>
      </div>
    </div>
  );
}
