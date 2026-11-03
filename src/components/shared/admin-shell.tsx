"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Bell,
  ChevronDown,
  Files,
  Gauge,
  LifeBuoy,
  Menu,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tags,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConsolePathContext, consoleHref, useConsolePath } from "@/components/shared/console-path";
import { hydrateAuthFromServer, useAuth } from "@/services/account";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface AdminNavEntry {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AdminNavGroup {
  label: string;
  entries: AdminNavEntry[];
}

/** Nav model relative to the console base — never embeds the literal /admin. */
export function buildAdminNav(basePath: string): AdminNavGroup[] {
  return [
    {
      label: "Overview",
      entries: [{ label: "Dashboard", href: basePath, icon: Gauge }],
    },
    {
      label: "Catalog",
      entries: [
        { label: "Products", href: consoleHref(basePath, "/catalog/products"), icon: Package },
        { label: "Categories", href: consoleHref(basePath, "/catalog/categories"), icon: Tags },
        { label: "Brands", href: consoleHref(basePath, "/catalog/brands"), icon: BadgeCheck },
      ],
    },
    {
      label: "Media",
      entries: [{ label: "Media library", href: consoleHref(basePath, "/media"), icon: Files }],
    },
    {
      label: "People",
      entries: [
        { label: "Customers", href: consoleHref(basePath, "/customers"), icon: UsersRound },
        { label: "Orders", href: consoleHref(basePath, "/orders"), icon: ShoppingBag },
        { label: "Support", href: consoleHref(basePath, "/support"), icon: LifeBuoy },
      ],
    },
    {
      label: "System",
      entries: [
        { label: "Settings", href: consoleHref(basePath, "/settings"), icon: Settings },
        { label: "Users", href: consoleHref(basePath, "/users"), icon: Users },
        { label: "Roles", href: consoleHref(basePath, "/roles"), icon: ShieldCheck },
        { label: "Audit log", href: consoleHref(basePath, "/audit-log"), icon: ScrollText },
      ],
    },
  ];
}

function isActive(pathname: string, href: string, basePath: string) {
  return href === basePath ? pathname === basePath : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({
  onNavigate,
  variant,
  collapsed = false,
}: {
  onNavigate?: () => void;
  variant: "sidebar" | "drawer";
  /** Sidebar mode only — collapses entries to icon-only rail. */
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const basePath = useConsolePath();
  const nav = buildAdminNav(basePath);
  // Variant-scoped layoutId: a shared id across BOTH mounted NavLists
  // (desktop sidebar + mobile drawer) makes the active pill teleport
  // between them when the drawer opens.
  const layoutId = `admin-nav-active-${variant}`;
  return (
    <nav aria-label="Admin sections" className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 py-2">
      {nav.map((group) => (
        <div key={group.label}>
          {collapsed ? (
            // Icon-only rail — the group heading becomes a quiet divider.
            <div className="mx-2 border-t border-line" aria-hidden="true" />
          ) : (
            <p className="px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{group.label}</p>
          )}
          <ul className="space-y-0.5">
            {group.entries.map((entry) => {
              const active = isActive(pathname, entry.href, basePath);
              return (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? entry.label : undefined}
                    className={cn(
                      "relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-[0.86rem] font-medium transition-colors",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-violet-glow/14 text-foreground"
                        : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={layoutId}
                        className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gradient-to-b from-violet-glow to-ice"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        aria-hidden="true"
                      />
                    )}
                    <entry.icon className={cn("size-[1.05rem] shrink-0", active && "text-violet-soft")} aria-hidden="true" />
                    <span className={cn("truncate", collapsed && "sr-only")}>{entry.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarInner({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 overflow-hidden border-b border-line transition-all duration-300",
          collapsed ? "justify-center px-0" : "px-5"
        )}
      >
        <Logo compact />
        {!collapsed && (
          <div className="leading-tight">
            <p className="font-display text-sm font-bold tracking-[0.24em] text-foreground">TereaCOD</p>
            <p className="text-[0.62rem] uppercase tracking-[0.2em] text-violet-soft">Control room</p>
          </div>
        )}
      </div>
      <NavList onNavigate={onNavigate} variant="sidebar" collapsed={collapsed} />
      <div className="border-t border-line p-4">
        {collapsed ? (
          <p className="text-center text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground/70" title="Live operations console">
            <span aria-hidden="true">•••</span>
            <span className="sr-only">Live operations console</span>
          </p>
        ) : (
          <p className="text-[0.68rem] leading-relaxed text-muted-foreground/80">
            Live operations console — every figure reads from the operational database in real time.
          </p>
        )}
      </div>
    </div>
  );
}

function UserChip() {
  // Session-derived identity. The admin layout does not mount AppBootstrap,
  // so the shell hydrates the auth store itself (once, best-effort).
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  useEffect(() => {
    if (!useAuth.getState().hydrated) void hydrateAuthFromServer();
  }, []);
  const displayName = (hydrated ? user?.displayName?.trim() : "") || "Staff";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "S";
  return (
    <div className="flex items-center gap-2.5 rounded-full border border-line py-1 pl-1 pr-3">
      <span
        className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-glow to-ice text-[0.7rem] font-bold text-white"
        aria-hidden="true"
      >
        {initials}
      </span>
      <span className="hidden max-w-40 truncate text-sm font-medium text-foreground sm:block">
        {displayName}
      </span>
      <span className="sr-only">Signed in as {displayName}</span>
    </div>
  );
}

/**
 * AdminShell — calm, information-dense admin frame.
 * Desktop: collapsible fixed sidebar. Mobile: drawer + top bar.
 * The server layout injects the secret console base path; it flows to every
 * nav item and deep view link through ConsolePathContext. The base itself is
 * never rendered as text (no breadcrumb leak of the secret segment).
 */
export function AdminShell({ basePath, children }: { basePath: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Restore the last collapse choice after mount (localStorage) — reading it
  // during the first render would diverge from the SSR markup. Deferred via
  // microtask so the effect body never sets state synchronously.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("admin-sidebar");
      if (stored === "collapsed") queueMicrotask(() => setCollapsed(true));
    } catch {
      /* private mode — default to expanded */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("admin-sidebar", collapsed ? "collapsed" : "expanded");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const inner = pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : "";
  const crumbs = ["Console", ...inner.split("/").filter(Boolean)];

  return (
    <ConsolePathContext.Provider value={basePath}>
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        aria-label="Admin sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r border-line bg-abyss/90 backdrop-blur-xl transition-[width] duration-300 lg:block",
          collapsed ? "w-[4.5rem]" : "w-64"
        )}
      >
        <SidebarInner onNavigate={() => undefined} collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <AnimatePresence>
          {mobileOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild forceMount>
                <motion.div variants={variants.backdrop} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount aria-label="Admin menu">
                <motion.div
                  variants={variants.drawerLeft}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="fixed inset-y-0 left-0 z-[70] w-[min(19rem,88vw)] overflow-hidden rounded-r-3xl border-r border-line bg-abyss focus:outline-none"
                >
                  {/* Radix requires an accessible title/description for the
                      dialog — kept visually hidden, the nav is the content. */}
                  <Dialog.Title className="sr-only">Admin menu</Dialog.Title>
                  <Dialog.Description className="sr-only">Admin sections navigation</Dialog.Description>
                  <NavList onNavigate={() => setMobileOpen(false)} variant="drawer" />
                  <Dialog.Close aria-label="Close admin menu" className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground">
                    <X className="size-5" aria-hidden="true" />
                  </Dialog.Close>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>

      {/* Main column */}
      <div className={cn("flex min-h-screen w-full flex-col transition-[padding] duration-300", collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64")}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-abyss/85 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open admin menu"
            className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="hidden size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground lg:inline-flex"
          >
            <ChevronDown className={cn("size-5 rotate-90 transition-transform duration-300", collapsed && "-rotate-90")} aria-hidden="true" />
          </button>

          <a
            href="#admin-main"
            className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999]"
          >
            Skip to console content
          </a>
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex items-center gap-1.5 text-[0.8rem] text-muted-foreground">
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="opacity-40" aria-hidden="true">/</span>}
                  <span className={cn("truncate capitalize", i === crumbs.length - 1 && "text-foreground")}>{c || "Dashboard"}</span>
                </li>
              ))}
            </ol>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* The bell is an honest shortcut to the support inbox — no fake
                unread count, notifications are not a built feature yet. */}
            <ConsoleBell />
            <ThemeToggle className="rounded-lg" />
            <UserChip />
          </div>
        </header>

        <main id="admin-main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>

        <footer className="border-t border-line px-4 py-4 text-[0.72rem] text-muted-foreground sm:px-6">
          TereaCOD admin · staff session · RBAC enforced server-side
        </footer>
      </div>
    </div>
    </ConsolePathContext.Provider>
  );
}

function ConsoleBell() {
  const basePath = useConsolePath();
  return (
    <Link
      href={consoleHref(basePath, "/support")}
      title="Support tickets"
      aria-label="Support tickets"
      className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
    >
      <Bell className="size-[1.1rem]" aria-hidden="true" />
    </Link>
  );
}
