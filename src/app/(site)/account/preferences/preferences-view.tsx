"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Checkbox, FormError, FormSuccess, Select } from "@/components/forms/fields";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { ErrorState } from "@/components/shared/error-state";
import { accountService } from "@/services/account";
import { useToast } from "@/hooks/use-toast";
import type { AccountPreferences } from "@/types";

type LoadState =
  | { state: "loading" }
  | { state: "success"; prefs: AccountPreferences }
  | { state: "error" };

export function PreferencesView() {
  const [load, setLoad] = useState<LoadState>({ state: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [language, setLanguage] = useState("en-AE");
  const [productUpdates, setProductUpdates] = useState(false);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [researchInvites, setResearchInvites] = useState(false);
  const [personalization, setPersonalization] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    accountService
      .getPreferences()
      .then((prefs) => {
        if (cancelled) return;
        setLoad({ state: "success", prefs });
        setLanguage(prefs.language);
        setProductUpdates(prefs.communications.productUpdates);
        setOrderUpdates(prefs.communications.orderUpdates);
        setResearchInvites(prefs.communications.researchInvites);
        setPersonalization(prefs.privacy.personalization);
        setAnalytics(prefs.privacy.analytics);
        setReducedMotion(prefs.accessibility.reducedMotion);
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setSaving(true);
    try {
      const result = await accountService.updatePreferences({
        language,
        communications: { productUpdates, orderUpdates, researchInvites },
        privacy: { personalization, analytics },
        accessibility: { reducedMotion },
      });
      setSuccess(result.message);
      toast({ title: "Preferences saved", description: result.message });
    } catch {
      // Failed saves must be visible — never silent.
      setError("We couldn't save your preferences just now — please try again.");
      toast({ title: "Save failed", description: "Your preferences could not be saved. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (load.state === "loading") {
    return (
      <div className="rounded-2xl border border-line bg-elevated/50 p-6">
        <LoadingIndicator label="Loading preferences" />
      </div>
    );
  }

  if (load.state === "error") {
    return (
      <ErrorState
        title="Preferences unavailable"
        body="The preferences service could not be reached."
        onRetry={() => {
          setLoad({ state: "loading" });
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <form onSubmit={onSave} noValidate className="space-y-5">
      {/* Language & region */}
      <section className="rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6" aria-labelledby="prefs-language-heading">
        <h2 id="prefs-language-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
          Language &amp; region
        </h2>
        <div className="mt-4 max-w-sm">
          <label htmlFor="prefs-language" className="mb-1.5 block text-[0.82rem] font-medium text-foreground">
            Interface language
          </label>
          <Select id="prefs-language" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en-AE">English (UAE) — en-AE</option>
            <option value="ar-AE">العربية (UAE) — ar-AE</option>
          </Select>
          <p className="mt-1.5 text-[0.75rem] leading-relaxed text-muted-foreground">
            The Arabic interface is coming soon — your language choice is saved to your account and will apply once it
            ships.
          </p>
        </div>
      </section>

      {/* Communications */}
      <section className="rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6" aria-labelledby="prefs-comms-heading">
        <h2 id="prefs-comms-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
          Communications
        </h2>
        <p className="mt-1 text-[0.82rem] text-muted-foreground">
          Separate consents — each can be changed independently.
        </p>
        <div className="mt-4 space-y-4">
          <Checkbox
            label="Product updates"
            description="New devices, liquids and restock announcements."
            checked={productUpdates}
            onChange={setProductUpdates}
          />
          <Checkbox
            label="Order updates"
            description="Status updates about your orders, from confirmation to delivery."
            checked={orderUpdates}
            onChange={setOrderUpdates}
          />
          <Checkbox
            label="Research invites"
            description="Occasional invitations to product research sessions."
            checked={researchInvites}
            onChange={setResearchInvites}
          />
        </div>
      </section>

      {/* Privacy */}
      <section className="rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6" aria-labelledby="prefs-privacy-heading">
        <h2 id="prefs-privacy-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
          Privacy
        </h2>
        <div className="mt-4 space-y-4">
          <Checkbox
            label="Personalised recommendations"
            description="Use browsing history to tailor product suggestions."
            checked={personalization}
            onChange={setPersonalization}
          />
          <Checkbox
            label="Analytics"
            description="Share anonymised usage data to help improve the site."
            checked={analytics}
            onChange={setAnalytics}
          />
        </div>
        <p className="mt-4 text-[0.8rem] text-muted-foreground">
          Cookie preferences are managed separately —{" "}
          <Link href="/legal/cookies" className="font-medium text-violet-soft underline-offset-2 hover:underline">
            cookie settings
          </Link>
          .
        </p>
      </section>

      {/* Accessibility */}
      <section className="rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6" aria-labelledby="prefs-a11y-heading">
        <h2 id="prefs-a11y-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
          Accessibility
        </h2>
        <div className="mt-4">
          <Checkbox
            label="Reduced motion"
            description="Respects your device setting by default; your choice is saved to your account."
            checked={reducedMotion}
            onChange={setReducedMotion}
          />
        </div>
      </section>

      {success && <FormSuccess>{success}</FormSuccess>}
      {error && <FormError>{error}</FormError>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 font-medium text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <LoadingIndicator label="Saving" size="sm" className="text-primary-foreground/90" /> : "Save preferences"}
        </button>
        <p className="text-[0.78rem] text-muted-foreground">Your preferences are saved to your account.</p>
      </div>
    </form>
  );
}
