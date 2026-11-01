"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { BadgeCheck, MailCheck } from "lucide-react";
import {
  FormError,
  FormField,
  FormSuccess,
  TextInput,
} from "@/components/forms/fields";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { accountService, useAuth } from "@/services/account";

const verifySchema = z.object({
  email: z.email({ message: "Enter a valid email address." }),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from the email."),
});

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"email" | "code", string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const autoSubmitted = useRef(false);

  // Email links carry ?code= — verify automatically once.
  useEffect(() => {
    const preset = searchParams.get("code");
    const presetEmail = searchParams.get("email");
    if (!autoSubmitted.current && preset && presetEmail && /^\d{6}$/.test(preset)) {
      autoSubmitted.current = true;
      void submit(presetEmail, preset);
    }
     
  }, []);

  // 1-second ticker for the resend cooldown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const alreadyVerified = user?.verification === "verified";

  async function submit(emailValue: string, codeValue: string) {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const result = await accountService.verifyEmail(emailValue.trim().toLowerCase(), codeValue);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setVerified(true);
    } catch {
      setError("Verification could not be completed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = verifySchema.safeParse({ email, code });
    if (!parsed.success) {
      const next: typeof fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "") as "email" | "code";
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    void submit(parsed.data.email, parsed.data.code);
  };

  const onResend = async () => {
    if (cooldown > 0 || resending) return;
    const parsedEmail = z.email().safeParse(email.trim());
    if (!parsedEmail.success) {
      setFieldErrors((prev) => ({ ...prev, email: "Enter a valid email address first." }));
      return;
    }
    setResending(true);
    setError(null);
    try {
      const result = await accountService.resendEmailCode(parsedEmail.data);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice("A fresh code is on its way. It expires in 15 minutes.");
      setDevCode(result.devCode ?? null);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Could not send a new code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (verified || alreadyVerified) {
    return (
      <div className="glass rounded-3xl p-6 shadow-2xl shadow-violet-glow/5 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl border border-success/40 bg-success/10 text-success">
            <BadgeCheck className="size-6" aria-hidden="true" />
          </span>
          <h1 className="font-display text-h2 font-bold text-foreground">
            {verified ? "Email verified" : "Already verified"}
          </h1>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {verified
              ? "Your email is confirmed. Every account feature is now unlocked."
              : "This account's email is already confirmed — nothing more to do here."}
          </p>
        </div>
        <div className="mt-8 flex flex-col items-center gap-3">
          {hydrated && user ? (
            <button
              type="button"
              onClick={() => router.push("/account")}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary font-medium text-primary-foreground transition-all hover:brightness-110"
            >
              Continue to your account
            </button>
          ) : (
            <Link
              href="/account/sign-in"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary font-medium text-primary-foreground transition-all hover:brightness-110"
            >
              Sign in to continue
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-6 shadow-2xl shadow-violet-glow/5 sm:p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl border border-line bg-foreground/[0.04] text-violet-soft">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <h1 className="font-display text-h2 font-bold text-foreground">Verify your email</h1>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          We emailed a 6-digit code to you. Enter it below to activate the account — the code expires in 15 minutes.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <FormField label="Email" htmlFor="verify-email" error={fieldErrors.email} required>
          <TextInput
            id="verify-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(fieldErrors.email)}
          />
        </FormField>

        <FormField label="Verification code" htmlFor="verify-code" error={fieldErrors.code} required>
          <TextInput
            id="verify-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="text-center font-mono text-lg tracking-[0.5em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            invalid={Boolean(fieldErrors.code)}
          />
        </FormField>

        {error && <FormError>{error}</FormError>}
        {notice && <FormSuccess>{notice}</FormSuccess>}
        {devCode && (
          <PrototypeNotice>
            Development mode — email delivery is not configured. Your verification code is{" "}
            <strong className="font-mono tracking-widest">{devCode}</strong>.
          </PrototypeNotice>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary font-medium text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <LoadingIndicator label="Verifying" size="sm" className="text-primary-foreground/90" />
          ) : (
            "Verify email"
          )}
        </button>

        <div className="flex flex-col items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => void onResend()}
            disabled={cooldown > 0 || resending}
            className="min-h-11 text-violet-soft underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground"
          >
            {resending
              ? "Sending…"
              : cooldown > 0
                ? `Request a new code in ${cooldown}s`
                : "Did not receive it? Send a new code"}
          </button>
          <p className="text-muted-foreground">
            <Link
              href="/account/sign-in"
              className="font-medium text-foreground underline-offset-4 transition-colors hover:text-violet-soft hover:underline"
            >
              Back to sign-in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
