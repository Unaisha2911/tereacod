"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Logo } from "@/components/layout/logo";
import {
  FormError,
  FormField,
  FormSuccess,
  PasswordInput,
  TextInput,
} from "@/components/forms/fields";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { accountService } from "@/services/account";
import { mergeCartAfterSignIn } from "@/services/cart";
import { hydrateSavedItemsFromServer } from "@/services/saved-items";

const signInSchema = z.object({
  email: z.email({ message: "Enter a valid email address." }),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type FieldErrors = Partial<Record<"email" | "password", string>>;

function collectFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if ((key === "email" || key === "password") && !out[key]) out[key] = issue.message;
  }
  return out;
}

export function SignInView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(collectFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await accountService.signIn(parsed.data.email, parsed.data.password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // Sync server state after sign-in: merge the guest cart and load
      // the account's saved items into the local stores.
      await Promise.all([mergeCartAfterSignIn(), hydrateSavedItemsFromServer(true)]);
      setSuccess(result.message);
      const next = searchParams.get("next");
      // Same-origin only — a protocol-relative value ("//evil.com") would
      // otherwise push the browser off-site after login.
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      if (result.emailVerified === false) {
        // Signed in, but the account still needs the email OTP — route
        // there before any other destination.
        router.push(`/account/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
      } else if (safeNext) {
        router.push(safeNext);
      } else if (result.isStaff && result.consolePath) {
        // Staff landing: straight into the (secret) console.
        router.push(result.consolePath);
      } else {
        router.push("/account");
      }
      router.refresh();
    } catch {
      setError("Sign-in could not be completed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass rounded-3xl p-6 shadow-2xl shadow-violet-glow/5 sm:p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo />
        <h1 className="font-display text-h2 font-bold text-foreground">Welcome back</h1>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          Sign in to manage your orders, saved items and preferences.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <FormField label="Email" htmlFor="signin-email" error={fieldErrors.email} required>
          <TextInput
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "signin-email-error" : undefined}
          />
        </FormField>

        <FormField label="Password" htmlFor="signin-password" error={fieldErrors.password} required>
          <PasswordInput
            id="signin-password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "signin-password-error" : undefined}
          />
        </FormField>

        <p className="text-[0.78rem] leading-relaxed text-muted-foreground">
          For your convenience, sessions on this device stay signed in for 30 days. You can sign out any time from
          Security → Active sessions.
        </p>

        {error && <FormError>{error}</FormError>}
        {success && <FormSuccess>{success}</FormSuccess>}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary font-medium text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <LoadingIndicator label="Signing in" size="sm" className="text-primary-foreground/90" />
          ) : (
            "Sign in"
          )}
        </button>

        <div className="flex flex-col items-center gap-2 text-sm">
          <Link href="/account/forgot-password" className="text-violet-soft transition-colors hover:text-foreground">
            Forgot password?
          </Link>
          <p className="text-muted-foreground">
            New to TereaCOD?{" "}
            <Link href="/account/register" className="font-medium text-foreground underline-offset-4 transition-colors hover:text-violet-soft hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
