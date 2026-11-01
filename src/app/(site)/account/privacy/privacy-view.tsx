"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import { FormSuccess, TextInput } from "@/components/forms/fields";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { ErrorState } from "@/components/shared/error-state";
import { useToast } from "@/hooks/use-toast";
import { accountService } from "@/services/account";
import { formatDate } from "@/lib/format";
import type { UserProfile } from "@/types";

type LoadState =
  | { state: "loading" }
  | { state: "success"; profile: UserProfile }
  | { state: "error" };

const cardShell = "rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6";

export function PrivacyView() {
  const { toast } = useToast();
  const [load, setLoad] = useState<LoadState>({ state: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    accountService
      .getProfile()
      .then((profile) => {
        if (!cancelled) setLoad({ state: "success", profile });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const submitRequest = async (kind: "access" | "deletion") => {
    setResult(null);
    setBusy(true);
    try {
      const response = await accountService.submitPrivacyRequest(kind);
      setResult(response.message);
    } catch {
      setResult(null);
      toast({
        title: "Request failed",
        description: "The request could not be submitted. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (load.state === "loading") {
    return (
      <div className={cardShell}>
        <LoadingIndicator label="Loading stored data" />
      </div>
    );
  }

  if (load.state === "error") {
    return (
      <ErrorState
        title="Privacy data unavailable"
        body="Your account data could not be loaded. Please try again."
        onRetry={() => {
          setLoad({ state: "loading" });
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  const profile = load.profile;

  return (
    <div className="space-y-5">
      {/* Stored data review */}
      <section className={cardShell} aria-labelledby="privacy-data-heading">
        <h2 id="privacy-data-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
          What your account holds
        </h2>
        <p className="mt-1 text-[0.82rem] text-muted-foreground">
          The personal data stored on your TereaCOD account. No analytics identifiers, tracking pixels or third-party
          cookies are involved.
        </p>
        <dl className="mt-4 divide-y divide-line text-sm">
          {[
            { label: "Display name", value: profile.displayName },
            { label: "Email", value: profile.email },
            { label: "Phone", value: profile.phone ?? "—" },
            { label: "Locale", value: profile.locale },
            { label: "Member since", value: formatDate(profile.joinedAt) },
            { label: "Profile id", value: profile.id },
          ].map((row) => (
            <div key={row.label} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[0.78rem] text-muted-foreground">Read-only — edit these fields from the profile page.</p>
      </section>

      {result && <FormSuccess>{result}</FormSuccess>}

      {/* Data access request */}
      <section className={cardShell} aria-labelledby="privacy-access-heading">
        <h2 id="privacy-access-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
          Data access request
        </h2>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-muted-foreground">
          Request an export of the personal data associated with your account. Requests are fulfilled within 30 days
          as required by UAE data protection law.
        </p>
        <button
          type="button"
          onClick={() => setAccessOpen(true)}
          disabled={busy}
          className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full border border-line px-6 text-sm font-medium text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.04] disabled:opacity-60"
        >
          Request data export
        </button>
      </section>

      {/* Account deletion */}
      <section className="rounded-2xl border border-error/30 bg-error/[0.04] p-5 sm:p-6" aria-labelledby="privacy-deletion-heading">
        <h2 id="privacy-deletion-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
          Account deletion
        </h2>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-muted-foreground">
          Request permanent deletion of the account and its data. Deletion is irreversible and removes your order
          history, saved items and preferences once processed.
        </p>
        <button
          type="button"
          onClick={() => {
            setConfirmText("");
            setDeletionOpen(true);
          }}
          disabled={busy}
          className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full border border-error text-error px-6 text-sm font-medium transition-colors hover:bg-error/10 disabled:opacity-60"
        >
          Request account deletion
        </button>
      </section>

      {/* Privacy links */}
      <section className={cardShell} aria-labelledby="privacy-links-heading">
        <h2 id="privacy-links-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
          Related policies
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/legal/privacy" className="font-medium text-violet-soft underline-offset-2 hover:underline">
              Privacy notice
            </Link>
          </li>
          <li>
            <Link href="/legal/cookies" className="font-medium text-violet-soft underline-offset-2 hover:underline">
              Cookie policy
            </Link>
          </li>
        </ul>
        <p className="mt-4 text-[0.78rem] text-muted-foreground">
          Both requests are submitted to TereaCOD and handled by our privacy team within 30 days, as required by UAE
          data protection law.
        </p>
      </section>

      {/* Access confirmation */}
      <AlertDialog open={accessOpen} onOpenChange={setAccessOpen}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Request your data?</AlertDialogTitle>
            <AlertDialogDescription>
              We'll queue an export of your data and fulfil it within 30 days, as required by UAE data protection law.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void submitRequest("access");
              }}
            >
              Send request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deletion confirmation — type to confirm */}
      <AlertDialog open={deletionOpen} onOpenChange={setDeletionOpen}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Request account deletion?</AlertDialogTitle>
            <AlertDialogDescription>
              Type DELETE to confirm. This starts an irreversible deletion request — our privacy team verifies and
              completes it within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <label htmlFor="privacy-delete-confirm" className="mb-1.5 block text-[0.82rem] font-medium text-foreground">
              Type DELETE to confirm
            </label>
            <TextInput
              id="privacy-delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== "DELETE" || busy}
              className="border-error bg-error text-white hover:bg-error/90"
              onClick={() => {
                void submitRequest("deletion");
              }}
            >
              {busy ? "Sending…" : "Send deletion request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
