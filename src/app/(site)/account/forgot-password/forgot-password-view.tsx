"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { FormError, FormField, FormSuccess, TextInput } from "@/components/forms/fields";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { accountService } from "@/services/account";

const forgotSchema = z.object({
  email: z.email({ message: "Enter a valid email address." }),
});

export function ForgotPasswordView() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    const parsed = forgotSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }
    setFieldError(null);
    setSubmitting(true);
    try {
      const result = await accountService.requestPasswordReset(parsed.data.email);
      setSuccess(result.message);
      setSentEmail(result.email ?? parsed.data.email);
      setDevCode(result.devCode ?? null);
    } catch {
      setError("The request could not be completed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass rounded-3xl p-6 shadow-2xl shadow-violet-glow/5 sm:p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-display text-h2 font-bold text-foreground">Forgot password</h1>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          Enter the email on your account and we'll send a 6-digit reset code. The code expires in one hour.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <FormField label="Email" htmlFor="forgot-email" error={fieldError ?? undefined} required>
          <TextInput
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(fieldError)}
          />
        </FormField>

        {error && <FormError>{error}</FormError>}
        {success && <FormSuccess>{success}</FormSuccess>}

        {success && (
          <>
            {devCode && (
              <PrototypeNotice>
                Development mode — email delivery is not configured. Your reset code is{" "}
                <strong className="font-mono tracking-widest">{devCode}</strong>.
              </PrototypeNotice>
            )}
            <p className="text-center text-sm">
              <Link
                href={`/account/reset-password${sentEmail ? `?email=${encodeURIComponent(sentEmail)}` : ""}`}
                className="inline-flex min-h-11 items-center font-medium text-violet-soft underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                I have the code — reset my password →
              </Link>
            </p>
          </>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary font-medium text-primary-foreground transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <LoadingIndicator label="Sending request" size="sm" className="text-primary-foreground/90" />
          ) : (
            "Send reset code"
          )}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/account/sign-in" className="font-medium text-foreground underline-offset-4 transition-colors hover:text-violet-soft hover:underline">
            Back to sign-in
          </Link>
        </p>

        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/account/register" className="font-medium text-foreground underline-offset-4 transition-colors hover:text-violet-soft hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
