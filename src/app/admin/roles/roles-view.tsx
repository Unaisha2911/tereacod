"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, Plus, ShieldAlert, ShieldCheck, UsersRound } from "lucide-react";
import type { AdminRole } from "@/types";
import { ErrorState } from "@/components/shared/error-state";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function RoleCardSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton-sheen h-52 rounded-2xl border border-line bg-foreground/[0.02]" />
      ))}
    </div>
  );
}

function RoleCard({ role }: { role: AdminRole }) {
  return (
    <article className="flex flex-col rounded-2xl border border-line bg-elevated/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-foreground/[0.03]">
            <ShieldCheck className={cn("size-5", role.system ? "text-violet-soft" : "text-muted-foreground")} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-[1.02rem] font-semibold text-foreground">{role.name}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-[0.78rem] text-muted-foreground">
              <UsersRound className="size-3.5" aria-hidden="true" />
              {role.members} member{role.members === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {role.system && <StatusBadge tone="violet">System</StatusBadge>}
      </div>

      <p className="mt-3.5 text-[0.84rem] leading-relaxed text-muted-foreground">{role.description}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {role.permissions.map((perm) => (
          <code
            key={perm}
            className="rounded-md border border-line bg-foreground/[0.04] px-2 py-1 font-mono text-[0.7rem] text-foreground/90"
          >
            {perm}
          </code>
        ))}
      </div>

      <div className="mt-auto pt-5">
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex rounded-xl">
              <Button variant="outline" size="sm" disabled>
                <Lock className="size-3.5" aria-hidden="true" />
                Edit role
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Role editing is not available in this console yet</TooltipContent>
        </Tooltip>
      </div>
    </article>
  );
}

export function RolesView({ initialRoles }: { initialRoles: AdminRole[] }) {
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [roles, setRoles] = useState<AdminRole[]>(initialRoles);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setState((s) => (s === "loading" ? "ready" : s)), 240);
    return () => clearTimeout(timer);
  }, [attempt]);

  const retry = useCallback(() => {
    setRoles(initialRoles);
    setState("loading");
    setAttempt((a) => a + 1);
  }, [initialRoles]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-violet-soft">System</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Roles</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Permission sets enforced across the admin API, grouped by responsibility.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/[0.06] px-4 py-3.5" role="note">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
        <p className="text-[0.86rem] font-medium leading-relaxed text-warning">
          Roles are read from the RBAC tables and enforced on every admin API request. Editing roles and
          memberships is not available in this console yet.
        </p>
      </div>

      <PrototypeNotice>
        Role definitions read from the RBAC database and enforced on every admin API request. Role editing and
        member management are not wired into this console yet.
      </PrototypeNotice>

      {state === "loading" && <RoleCardSkeleton />}
      {state === "error" && (
        <ErrorState title="Roles unavailable" body="The role registry could not be read. Try again to reload." onRetry={retry} />
      )}
      {state === "ready" && roles.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center text-sm text-muted-foreground">
          No roles defined in the RBAC registry.
        </p>
      )}
      {state === "ready" && roles.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {roles.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}

          {/* Add-role card */}
          <div className="flex flex-col items-start justify-center gap-3 rounded-2xl border border-dashed border-line-strong bg-foreground/[0.015] p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-foreground/[0.03]">
                <Plus className="size-5 text-muted-foreground" aria-hidden="true" />
              </span>
              <h2 className="font-display text-[1.02rem] font-semibold text-foreground">Add a role</h2>
            </div>
            <p className="text-[0.82rem] leading-relaxed text-muted-foreground">
              Creating roles needs role-management endpoints, which are not wired into this console yet. The
              seeded set above covers the launch team.
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex rounded-xl">
                  <Button variant="outline" size="sm" disabled>
                    <Plus className="size-3.5" aria-hidden="true" />
                    New role
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Role editing is not available in this console yet</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}
