"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { FormError, FormField, FormSuccess, TextInput } from "@/components/forms/fields";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { accountService } from "@/services/account";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/types";

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters."),
  email: z.email({ message: "Enter a valid email address." }),
  phone: z.string().max(24, "That phone number looks too long."),
});

type ProfileValues = z.infer<typeof profileSchema>;

type LoadState =
  | { state: "loading" }
  | { state: "success"; profile: UserProfile }
  | { state: "error" };

export function ProfileView() {
  const { toast } = useToast();
  const [load, setLoad] = useState<LoadState>({ state: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: "", email: "", phone: "" },
  });

  const isDirty = form.formState.isDirty;

  // Load the profile from the account API, then sync the form.
  useEffect(() => {
    let cancelled = false;
    accountService
      .getProfile()
      .then((profile) => {
        if (cancelled) return;
        setLoad({ state: "success", profile });
        form.reset({
          displayName: profile.displayName,
          email: profile.email,
          phone: profile.phone ?? "",
        });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [form, reloadKey]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const onSave = form.handleSubmit(async (values) => {
    setSuccess(null);
    setError(null);
    setSaving(true);
    try {
      const result = await accountService.updateProfile({
        displayName: values.displayName,
        // Trim + null so an emptied field actually clears the stored phone
        // (an empty string or undefined would leave the old value in place).
        phone: values.phone.trim() || null,
      });
      setSuccess(result.message);
      form.reset(values); // baseline for dirty tracking after a save
      toast({
        title: "Profile saved",
        description: "Your details were updated and stored on your account.",
      });
    } catch {
      setError("The profile could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  });

  const onCancel = () => {
    if (isDirty) {
      setConfirmOpen(true);
    } else {
      setSuccess(null);
      setError(null);
    }
  };

  if (load.state === "loading") {
    return (
      <div className="rounded-2xl border border-line bg-elevated/50 p-6">
        <LoadingIndicator label="Loading profile" />
      </div>
    );
  }

  if (load.state === "error") {
    return (
      <ErrorState
        title="Profile unavailable"
        body="Your profile could not be loaded. Please try again."
        retryLabel="Retry"
        onRetry={() => {
          setLoad({ state: "loading" });
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <>
      <form onSubmit={onSave} noValidate className="space-y-5">
        <section className="rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6">
          <h2 className="font-display text-[1.02rem] font-semibold text-foreground">Details</h2>
          <p className="mt-1 text-[0.82rem] text-muted-foreground">
            These details are saved to your TereaCOD account.
          </p>

          <div className="mt-5 space-y-5">
            <FormField
              label="Display name"
              htmlFor="profile-display-name"
              error={form.formState.errors.displayName?.message}
              required
            >
              <TextInput
                id="profile-display-name"
                autoComplete="name"
                invalid={Boolean(form.formState.errors.displayName)}
                {...form.register("displayName")}
              />
            </FormField>

            <FormField
              label="Email"
              htmlFor="profile-email"
              hint="Contact support to change your email address."
              error={form.formState.errors.email?.message}
              required
            >
              <TextInput
                id="profile-email"
                type="email"
                autoComplete="email"
                disabled
                aria-describedby="profile-email-hint"
                invalid={Boolean(form.formState.errors.email)}
                {...form.register("email")}
              />
            </FormField>

            <FormField
              label="Phone"
              htmlFor="profile-phone"
              hint="Used by the courier to contact you about your delivery."
              error={form.formState.errors.phone?.message}
            >
              <TextInput
                id="profile-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+971 50 000 0000"
                invalid={Boolean(form.formState.errors.phone)}
                {...form.register("phone")}
              />
            </FormField>
          </div>
        </section>

        {error && <FormError>{error}</FormError>}
        {success && <FormSuccess>{success}</FormSuccess>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving || !isDirty}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <LoadingIndicator label="Saving" size="sm" className="text-primary-foreground/90" />
            ) : (
              "Save changes"
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-6 font-medium text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.04] disabled:opacity-50"
          >
            Cancel
          </button>
          <p className="text-[0.78rem] text-muted-foreground" aria-live="polite">
            {isDirty ? "You have unsaved changes." : "No changes to save."}
          </p>
        </div>
      </form>

      <p className="text-[0.8rem] text-muted-foreground">
        Need to change your email?{" "}
        <Link href="/contact" className="font-medium text-violet-soft underline-offset-2 hover:underline">
          Contact support
        </Link>
        .
      </p>

      {/* Discard-changes confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved edits will be lost and the form will return to the details saved on your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Reset to the loaded profile, not to the empty defaults —
                // discarding should restore the saved account details.
                const p = load.state === "success" ? load.profile : null;
                form.reset(p ? { displayName: p.displayName, email: p.email, phone: p.phone ?? "" } : undefined);
                setSuccess(null);
                setError(null);
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
