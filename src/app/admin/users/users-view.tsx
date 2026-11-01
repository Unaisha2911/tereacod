"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConsolePath } from "@/components/shared/console-path";
import Link from "next/link";
import { KeyRound, UserPlus, Users, UsersRound } from "lucide-react";
import { adminService } from "@/services/admin";
import type { AdminStaffMember } from "@/types";
import { DataTable, type Column } from "@/components/shared/admin-primitives";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField, PasswordInput, Select, TextInput } from "@/components/forms/fields";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/format";

/* ------------------------------ status ---------------------------- */

function StaffStatusCell({ status }: { status: string }) {
  if (status === "active") return <StatusBadge tone="success">Active</StatusBadge>;
  if (status === "suspended") return <StatusBadge tone="error">Suspended</StatusBadge>;
  if (status === "pending") return <StatusBadge tone="warning">Pending</StatusBadge>;
  return <StatusBadge tone="ice">{status}</StatusBadge>;
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      <div className="skeleton-sheen h-11 rounded-xl border border-line bg-foreground/[0.02]" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-sheen h-14 rounded-xl border border-line bg-foreground/[0.02]" />
      ))}
    </div>
  );
}

/* --------------------------- create dialog ------------------------- */

type CreateKind = "staff" | "customer";

function CreateUserDialog({
  kind,
  roles,
  open,
  onOpenChange,
  onCreated,
}: {
  kind: CreateKind;
  roles: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (result: { email: string; tempPassword?: string }) => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isStaff = kind === "staff";

  const reset = () => {
    setEmail("");
    setDisplayName("");
    setRoleSlug("");
    setPassword("");
    setFieldErrors({});
  };

  const submit = async () => {
    setBusy(true);
    setFieldErrors({});
    try {
      const result = await adminService.createUser({
        email: email.trim(),
        displayName: displayName.trim(),
        password: password.trim() === "" ? undefined : password,
        roleSlug: isStaff ? roleSlug || undefined : undefined,
        kind,
      });
      onOpenChange(false);
      reset();
      onCreated({ email: result.email, tempPassword: result.tempPassword });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create the account.";
      setFieldErrors({ form: message });
      toast({ variant: "destructive", title: "Create failed", description: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{isStaff ? "Add staff member" : "Create customer account"}</DialogTitle>
          <DialogDescription>
            {isStaff
              ? "Staff accounts get console access for the chosen role. If you leave the password blank, the server generates a strong temporary one."
              : "Customer accounts can sign in to the storefront — they hold no console role. Leave the password blank to have one generated."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Email" htmlFor={`create-${kind}-email`} error={fieldErrors.email}>
            <TextInput
              id={`create-${kind}-email`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@tereacod.ae"
              autoComplete="off"
            />
          </FormField>
          <FormField label="Display name" htmlFor={`create-${kind}-name`}>
            <TextInput
              id={`create-${kind}-name`}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Full name"
              autoComplete="off"
            />
          </FormField>
          {isStaff && (
            <FormField label="Role" htmlFor="create-staff-role" hint="Determines console permissions — enforced on every API request.">
              <Select id="create-staff-role" value={roleSlug} onChange={(e) => setRoleSlug(e.target.value)}>
                <option value="">Choose a role…</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          <FormField
            label="Password (optional)"
            htmlFor={`create-${kind}-password`}
            hint="Min 8 characters. Leave blank to auto-generate a temporary password."
          >
            <PasswordInput
              id={`create-${kind}-password`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </FormField>
          {fieldErrors.form && <p className="text-[0.78rem] text-warning">{fieldErrors.form}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || email.trim() === "" || displayName.trim() === "" || (isStaff && roleSlug === "")}>
            <UserPlus className="size-4" aria-hidden="true" />
            {busy ? "Creating…" : isStaff ? "Create staff account" : "Create customer account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------ temp password dialog --------------------- */

function TempPasswordDialog({
  payload,
  onClose,
}: {
  payload: { email: string; tempPassword: string } | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload.tempPassword);
      setCopied(true);
      toast({ title: "Password copied", description: "Paste it into a secure channel for the new account holder." });
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "The clipboard is unavailable — select the password and copy it manually.",
      });
    }
  };

  return (
    <Dialog open={payload !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <KeyRound className="size-4 text-violet-soft" aria-hidden="true" />
            Temporary password generated
          </DialogTitle>
          <DialogDescription>
            A password was generated for {payload?.email}. Store it now —{" "}
            <strong className="font-semibold text-foreground">it is shown only once</strong> and cannot be retrieved
            later.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border border-line bg-foreground/[0.03] p-4">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Password</p>
          <p className="mt-1.5 select-all break-all font-mono text-base text-foreground">{payload?.tempPassword}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            I have stored it — close
          </Button>
          <Button onClick={() => void copy()}>{copied ? "Copied" : "Copy password"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
/* ------------------------------- view ------------------------------ */

export function UsersView() {
  const basePath = useConsolePath();
  const { toast } = useToast();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [staff, setStaff] = useState<AdminStaffMember[]>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [attempt, setAttempt] = useState(0);
  const [createKind, setCreateKind] = useState<CreateKind | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string; tempPassword: string } | null>(null);

  const load = useCallback(() => {
    adminService
      .staff()
      .then((data) => {
        setStaff(data.staff);
        setRoles(data.roles.map((r) => ({ id: r.id, name: r.name })));
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    load();
  }, [load, attempt]);

  const onCreated = useCallback(
    (result: { email: string; tempPassword?: string }) => {
      toast({
        title: "Account created",
        description: result.tempPassword
          ? `${result.email} was created with a generated temporary password.`
          : `${result.email} was created and can sign in with the password you set.`,
      });
      if (result.tempPassword) setTempPassword({ email: result.email, tempPassword: result.tempPassword });
      setAttempt((a) => a + 1);
    },
    [toast]
  );

  const columns = useMemo<Column<AdminStaffMember>[]>(
    () => [
      {
        key: "displayName",
        header: "Name",
        cell: (u) => (
          <div className="flex items-center gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-gradient-to-br from-violet-glow/25 to-ice/15 text-[0.7rem] font-bold text-foreground"
              aria-hidden="true"
            >
              {u.displayName
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2) || "?"}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-foreground">{u.displayName}</p>
              <p className="truncate text-[0.76rem] text-muted-foreground">{u.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: "roles",
        header: "Roles",
        cell: (u) =>
          u.roleNames.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {u.roleNames.map((name) => (
                <span key={name} className="rounded-full border border-line px-2 py-0.5 text-[0.72rem] text-muted-foreground">
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { key: "status", header: "Status", cell: (u) => <StaffStatusCell status={u.status} /> },
      {
        key: "lastLoginAt",
        header: "Last login",
        cell: (u) => (
          <span className="text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never signed in"}</span>
        ),
      },
    ],
    []
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-violet-soft">System</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Users</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Staff accounts with console access, plus customer accounts created by the team. Roles come from the RBAC
            tables and are enforced on every admin API request.
          </p>
        </div>
      </header>

      <PrototypeNotice>
        Live identity records — every row is a real account that can sign in. Creating an account writes to the
        identity tables and is audited; generated passwords are shown once.
      </PrototypeNotice>

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">Staff ({staff.length})</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.84rem] text-muted-foreground">
              Staff roster from the identity tables — roles, status and last login.
            </p>
            <Button onClick={() => setCreateKind("staff")}>
              <UserPlus className="size-4" aria-hidden="true" />
              Add staff
            </Button>
          </div>

          {state === "loading" && <TableSkeleton />}
          {state === "error" && (
            <ErrorState
              title="Staff roster unavailable"
              body="The staff service could not be reached. Try again to reload the roster."
              onRetry={() => {
                setState("loading");
                setAttempt((a) => a + 1);
              }}
            />
          )}
          {state === "ready" && staff.length === 0 && (
            <EmptyState
              icon={Users}
              title="No staff accounts"
              body="No staff accounts hold a console role yet. Add the first staff member to grant access."
              actionLabel="Add staff"
              onAction={() => setCreateKind("staff")}
            />
          )}
          {state === "ready" && staff.length > 0 && (
            <DataTable
              columns={columns}
              rows={staff}
              caption="Staff accounts with roles, status and last login"
              mobileCard={(u) => (
                <div className="rounded-2xl border border-line bg-elevated/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{u.displayName}</p>
                      <p className="truncate text-[0.78rem] text-muted-foreground">{u.email}</p>
                    </div>
                    <StaffStatusCell status={u.status} />
                  </div>
                  <p className="mt-2 text-[0.78rem] text-muted-foreground">
                    {u.roleNames.length > 0 ? u.roleNames.join(", ") : "No roles"}
                  </p>
                  <p className="mt-1 text-[0.74rem] text-muted-foreground">
                    {u.lastLoginAt ? `Last login ${formatDateTime(u.lastLoginAt)}` : "Never signed in"}
                  </p>
                </div>
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="customers" className="mt-5 space-y-4">
          <div className="rounded-2xl border border-line bg-elevated/40 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <h2 className="flex items-center gap-2 font-display text-[1.02rem] font-semibold text-foreground">
                  <UsersRound className="size-4 text-violet-soft" aria-hidden="true" />
                  Customer accounts
                </h2>
                <p className="mt-1.5 text-[0.84rem] leading-relaxed text-muted-foreground">
                  Create a sign-in account for a customer who ordered as a guest or over the phone. Customer accounts
                  hold no console role. The full customer list — with orders, tickets and privacy requests — lives in
                  the <Link href={basePath + "/customers"} className="text-violet-soft underline-offset-4 hover:underline">Customers</Link>{" "}
                  area.
                </p>
              </div>
              <Button variant="outline" onClick={() => setCreateKind("customer")}>
                <UserPlus className="size-4" aria-hidden="true" />
                Create customer
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CreateUserDialog
        kind={createKind ?? "staff"}
        roles={roles}
        open={createKind !== null}
        onOpenChange={(open) => !open && setCreateKind(null)}
        onCreated={onCreated}
      />
      <TempPasswordDialog key={tempPassword?.email ?? "none"} payload={tempPassword} onClose={() => setTempPassword(null)} />
    </div>
  );
}
