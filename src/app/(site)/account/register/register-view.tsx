"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle2, Circle } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import {
  Checkbox,
  FormError,
  FormField,
  FormSuccess,
  PasswordInput,
  TextInput,
} from "@/components/forms/fields";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { TurnstileWidget } from "@/components/forms/turnstile-widget";
import { accountService } from "@/services/account";
import { mergeCartAfterSignIn } from "@/services/cart";
import { hydrateSavedItemsFromServer } from "@/services/saved-items";
import { cn } from "@/lib/utils";
import { PASSWORD_HINT, passwordSchema } from "@/lib/validation";

const registerSchema = z.object({
  email: z.email({ message: "Enter a valid email address." }),
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirm your password."),
  acceptPrivacy: z
    .boolean()
    .refine((v) => v === true, { message: "You must accept the privacy notice" }),
  productUpdates: z.boolean(),
  researchInvites: z.boolean(),
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterView() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      acceptPrivacy: false,
      productUpdates: false,
      researchInvites: false,
    },
  });

  const password = form.watch("password");
  const hasLength = password.length >= 10;
  const hasNumber = /\d/.test(password);

  const onSubmit = form.handleSubmit(async (values) => {
    setSuccess(null);
    setError(null);
    if (values.password !== values.confirmPassword) {
      form.setError("confirmPassword", { message: "Passwords do not match." });
      return;
    }
    setSubmitting(true);
    try {
      // Safe derived display name: a single-character local part (e.g. "a@…")
      // would fail the server's min-2 validation, so fall back to "Customer".
      const local = values.email.split("@")[0] || "";
      const result = await accountService.register({
        email: values.email,
        password: values.password,
        displayName: local.length >= 2 ? local : "Customer",
        marketingOptIn: values.productUpdates,
        researchInvites: values.researchInvites,
        turnstileToken,
      });
      if (!result.ok) {
        setError(result.message);
        setTurnstileToken(null);
        return;
      }
      // Friction-free signup: the account is active and verified at
      // creation, so sign the customer in immediately — no OTP detour.
      const signIn = await accountService.signIn(values.email, values.password, turnstileToken);
      if (signIn.ok) {
        await Promise.all([mergeCartAfterSignIn(), hydrateSavedItemsFromServer(true)]);
        setSuccess(signIn.message);
        router.push("/account");
        router.refresh();
      } else {
        // Auto sign-in failed (rare) — the account exists; normal path applies.
        setSuccess("Account created. Sign in to continue.");
      }
    } catch {
      setError("Registration could not be completed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="glass rounded-3xl p-6 shadow-2xl shadow-violet-glow/5 sm:p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo />
        <h1 className="font-display text-h2 font-bold text-foreground">Create your account</h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          One account for your orders, saved items and bag on every device. Adults 18+ only.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <FormField label="Email" htmlFor="register-email" error={form.formState.errors.email?.message} required>
          <TextInput
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            invalid={Boolean(form.formState.errors.email)}
            {...form.register("email")}
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="register-password"
          hint={PASSWORD_HINT}
          error={form.formState.errors.password?.message}
          required
        >
          <PasswordInput
            id="register-password"
            autoComplete="new-password"
            placeholder="••••••••••"
            invalid={Boolean(form.formState.errors.password)}
            {...form.register("password")}
          />
        </FormField>

        {/* Live strength hint */}
        <ul className="flex flex-wrap gap-2" aria-label="Password requirements">
          <li
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-medium transition-colors",
              hasLength ? "border-success/40 bg-success/10 text-success" : "border-line text-muted-foreground"
            )}
          >
            {hasLength ? <CheckCircle2 className="size-3" aria-hidden="true" /> : <Circle className="size-3" aria-hidden="true" />}
            10+ characters
          </li>
          <li
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-medium transition-colors",
              hasNumber ? "border-success/40 bg-success/10 text-success" : "border-line text-muted-foreground"
            )}
          >
            {hasNumber ? <CheckCircle2 className="size-3" aria-hidden="true" /> : <Circle className="size-3" aria-hidden="true" />}
            Includes a number
          </li>
        </ul>

        <FormField
          label="Confirm password"
          htmlFor="register-confirm"
          error={form.formState.errors.confirmPassword?.message}
          required
        >
          <PasswordInput
            id="register-confirm"
            autoComplete="new-password"
            placeholder="••••••••••"
            invalid={Boolean(form.formState.errors.confirmPassword)}
            {...form.register("confirmPassword")}
          />
        </FormField>

        {/* Required privacy notice */}
        <Controller
          control={form.control}
          name="acceptPrivacy"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <Checkbox
                label="I accept the privacy notice"
                checked={field.value}
                onChange={field.onChange}
                name="acceptPrivacy"
              />
              <p className="text-[0.78rem] leading-relaxed text-muted-foreground">
                Read the{" "}
                <Link href="/legal/terms" className="text-violet-soft underline-offset-2 hover:underline">
                  terms of sale
                </Link>{" "}
                and the{" "}
                <Link href="/legal/privacy" className="text-violet-soft underline-offset-2 hover:underline">
                  privacy notice
                </Link>{" "}
                before continuing.
              </p>
              {fieldState.error && (
                <p role="alert" className="text-[0.78rem] text-error">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Optional communications — separate consents */}
        <div className="space-y-3 rounded-2xl border border-line bg-foreground/[0.02] p-4">
          <p className="text-[0.82rem] font-medium text-foreground">Optional communications</p>
          <Controller
            control={form.control}
            name="productUpdates"
            render={({ field }) => (
              <Checkbox
                label="Product updates"
                description="New devices, liquids and restocks."
                checked={field.value}
                onChange={field.onChange}
                name="productUpdates"
              />
            )}
          />
          <Controller
            control={form.control}
            name="researchInvites"
            render={({ field }) => (
              <Checkbox
                label="Research invites"
                description="Occasional invitations to product research sessions."
                checked={field.value}
                onChange={field.onChange}
                name="researchInvites"
              />
            )}
          />
        </div>

        {error && <FormError>{error}</FormError>}
        {success && <FormSuccess>{success}</FormSuccess>}

        <TurnstileWidget onToken={setTurnstileToken} action="register" />

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary font-medium text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <LoadingIndicator label="Creating account" size="sm" className="text-primary-foreground/90" />
          ) : (
            "Create account"
          )}
        </button>

        {success && (
          <p className="text-center text-sm">
            <Link
              href="/account/sign-in"
              className="inline-flex min-h-11 items-center font-medium text-violet-soft underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Go to sign-in →
            </Link>
          </p>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/account/sign-in" className="font-medium text-foreground underline-offset-4 transition-colors hover:text-violet-soft hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
