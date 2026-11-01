"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox, FormError, FormField, FormSuccess, PasswordInput } from "@/components/forms/fields";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingIndicator } from "@/components/shared/loading-indicator";
import { useToast } from "@/hooks/use-toast";
import { accountService } from "@/services/account";
import { PASSWORD_HINT, passwordSchema } from "@/lib/validation";

const changePasswordSchema = z.object({
  current: z.string().min(1, "Enter your current password."),
  next: passwordSchema,
  confirm: z.string().min(1, "Confirm your new password."),
});

type PasswordFieldErrors = Partial<Record<"current" | "next" | "confirm", string>>;

type SessionRow = { id: string; device: string; current: boolean; lastActive: string };

export function SecurityView() {
  const { toast } = useToast();

  /* ------------------------- Change password ------------------------- */
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwErrors, setPwErrors] = useState<PasswordFieldErrors>({});
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const onChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwSuccess(null);
    setPwError(null);

    const parsed = changePasswordSchema.safeParse({ current, next, confirm });
    const nextErrors: PasswordFieldErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if ((key === "current" || key === "next" || key === "confirm") && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
    }
    if (!nextErrors.confirm && next !== confirm) {
      nextErrors.confirm = "Passwords do not match.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setPwErrors(nextErrors);
      return;
    }

    setPwErrors({});
    // Password self-service is rolling out with email verification —
    // support can change a password today, so never pretend this saved.
    setPwSuccess(
      "Password changes are rolling out with email verification. Need it changed today? Contact support and we'll take care of it."
    );
  };

  /* --------------------------- Sessions ------------------------------ */
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [signOutAllOpen, setSignOutAllOpen] = useState(false);

  const loadSessions = useCallback(() => {
    accountService
      .sessions()
      .then((rows) => setSessions(rows))
      .catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const onRevokeSession = async (session: SessionRow) => {
    try {
      await accountService.revokeSession(session.id);
      toast({
        title: "Signed out",
        description: `${session.device} was signed out of your account.`,
      });
      loadSessions();
    } catch {
      toast({
        title: "Could not sign out",
        description: `${session.device} could not be signed out — please try again.`,
      });
    }
  };

  const onRevokeOtherSessions = async () => {
    try {
      await accountService.revokeOtherSessions();
      toast({
        title: "Other devices signed out",
        description: "Every other session was revoked — this device stays signed in.",
      });
      loadSessions();
    } catch {
      toast({
        title: "Could not sign out other devices",
        description: "Please try again in a moment.",
      });
    } finally {
      setSignOutAllOpen(false);
    }
  };

  /* --------------------- Security notifications ---------------------- */
  const [newDeviceAlerts, setNewDeviceAlerts] = useState(true);
  const [recoveryCodeAlerts, setRecoveryCodeAlerts] = useState(true);

  return (
    <div className="space-y-5">
      {/* Change password */}
      <section className="rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6" aria-labelledby="security-password-heading">
        <h2 id="security-password-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
          Change password
        </h2>
        <p className="mt-1 text-[0.82rem] text-muted-foreground">
          Password changes are rolling out with email verification — contact support to change it today.
        </p>

        <form onSubmit={onChangePassword} noValidate className="mt-5 max-w-md space-y-4">
          <FormField label="Current password" htmlFor="pw-current" error={pwErrors.current} required>
            <PasswordInput
              id="pw-current"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              invalid={Boolean(pwErrors.current)}
            />
          </FormField>
          <FormField
            label="New password"
            htmlFor="pw-next"
            hint={PASSWORD_HINT}
            error={pwErrors.next}
            required
          >
            <PasswordInput
              id="pw-next"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              invalid={Boolean(pwErrors.next)}
            />
          </FormField>
          <FormField label="Confirm new password" htmlFor="pw-confirm" error={pwErrors.confirm} required>
            <PasswordInput
              id="pw-confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              invalid={Boolean(pwErrors.confirm)}
            />
          </FormField>

          {pwError && <FormError>{pwError}</FormError>}
          {pwSuccess && <FormSuccess>{pwSuccess}</FormSuccess>}

          <button
            type="submit"
            disabled={pwSaving}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary font-medium text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
          >
            {pwSaving ? (
              <LoadingIndicator label="Updating" size="sm" className="text-primary-foreground/90" />
            ) : (
              "Update password"
            )}
          </button>
        </form>
      </section>

      {/* Sessions */}
      <section className="rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6" aria-labelledby="security-sessions-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="security-sessions-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
              Active sessions
            </h2>
            <p className="mt-1 text-[0.82rem] text-muted-foreground">Devices currently signed in to your account.</p>
          </div>
          <button
            type="button"
            onClick={() => setSignOutAllOpen(true)}
            className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-foreground transition-colors hover:border-error/50 hover:text-error"
          >
            Sign out all devices
          </button>
        </div>

        <ul className="mt-4 divide-y divide-line">
          {sessions === null && (
            <li className="py-4">
              <LoadingIndicator label="Loading sessions" />
            </li>
          )}
          {sessions?.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">No active sessions found.</li>
          )}
          {sessions?.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{session.device}</p>
                <p className="mt-0.5 text-[0.78rem] text-muted-foreground">Last active: {session.lastActive}</p>
              </div>
              {session.current ? (
                <StatusBadge tone="success">This device</StatusBadge>
              ) : (
                <button
                  type="button"
                  onClick={() => onRevokeSession(session)}
                  className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-foreground transition-colors hover:border-error/50 hover:text-error"
                >
                  Sign out
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Security notifications */}
      <section className="rounded-2xl border border-line bg-elevated/50 p-5 sm:p-6" aria-labelledby="security-alerts-heading">
        <h2 id="security-alerts-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
          Security notifications
        </h2>
        <p className="mt-1 text-[0.82rem] text-muted-foreground">
          These alert settings are kept for this session — account-level notification preferences are in rollout.
        </p>
        <div className="mt-4 space-y-4">
          <Checkbox
            label="New-device alerts"
            description="Email me when a new device signs in to the account."
            checked={newDeviceAlerts}
            onChange={setNewDeviceAlerts}
          />
          <Checkbox
            label="Recovery-code alerts"
            description="Email me when recovery codes are generated or used."
            checked={recoveryCodeAlerts}
            onChange={setRecoveryCodeAlerts}
          />
        </div>
      </section>

      {/* MFA placeholder */}
      <section className="rounded-2xl border border-dashed border-line-strong bg-foreground/[0.02] p-5 sm:p-6" aria-labelledby="security-mfa-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="security-mfa-heading" className="font-display text-[1.02rem] font-semibold text-foreground">
              Multi-factor authentication
            </h2>
            <p className="mt-1 max-w-md text-[0.82rem] text-muted-foreground">
              TOTP and passkey support is planned — the switch will unlock once multi-factor authentication ships.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[0.78rem] text-muted-foreground">Planned</span>
            <Switch checked={false} disabled aria-label="Multi-factor authentication (planned)" />
          </div>
        </div>
      </section>

      {/* Sign-out-all confirmation */}
      <AlertDialog open={signOutAllOpen} onOpenChange={setSignOutAllOpen}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out all devices?</AlertDialogTitle>
            <AlertDialogDescription>
              Every session except this device will be revoked. You stay signed in here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onRevokeOtherSessions()}>Sign out all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
