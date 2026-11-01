"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { NavigationItem } from "@/types";

/**
 * MobileNavigation — full-height, app-like secondary navigation sheet.
 * Radix Dialog provides focus trap, escape, scroll-lock and focus
 * restoration; Motion provides the slide animation.
 * Navigation data is passed in from the server-rendered shell
 * (headerNav() / footerColumns() / legalNav()).
 */
export function MobileNavigation({
  open,
  onClose,
  headerNav,
  footerColumns,
  legalNav,
}: {
  open: boolean;
  onClose: () => void;
  headerNav: NavigationItem[];
  footerColumns: NavigationItem[][];
  legalNav: NavigationItem[];
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const columns = footerColumns;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                variants={variants.backdrop}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-label="Site menu">
              <motion.div
                id="mobile-navigation"
                variants={variants.drawerRight}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="glass-strong fixed inset-y-0 right-0 z-[70] flex w-[min(24rem,92vw)] flex-col overflow-y-auto overscroll-contain rounded-l-3xl border-l focus:outline-none"
              >
                {/* Radix requires an accessible title/description for the dialog. */}
                <Dialog.Title className="sr-only">Site menu</Dialog.Title>
                <Dialog.Description className="sr-only">Site sections navigation</Dialog.Description>
                <div className="flex items-center justify-between px-5 py-4">
                  <Logo />
                  <div className="flex items-center gap-1">
                    <ThemeToggle />
                    <Dialog.Close
                      aria-label="Close menu"
                      className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </Dialog.Close>
                  </div>
                </div>

                <nav aria-label="Site sections" className="flex flex-1 flex-col gap-7 px-5 pb-10">
                  <section aria-label="Primary">
                    <ul className="space-y-1">
                      {[{ label: "Home", href: "/" }, ...headerNav, { label: "Cart", href: "/cart", description: "Review your bag" }].map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={isActive(item.href) ? "page" : undefined}
                            className={cn(
                              "flex min-h-12 items-center justify-between rounded-xl px-4 text-[0.95rem] font-medium transition-colors",
                              isActive(item.href)
                                ? "bg-violet-glow/15 text-foreground"
                                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                            )}
                          >
                            {item.label}
                            <ChevronRight className="size-4 opacity-40" aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {columns.map((col, idx) => (
                    <section key={idx} aria-label={col[0]?.label ? `More links ${idx + 1}` : `Links ${idx + 1}`}>
                      <ul className="grid grid-cols-2 gap-1">
                        {col.map((item) => (
                          <li key={item.id}>
                            <Link
                              href={item.href}
                              className="flex min-h-11 items-center rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}

                  <section aria-label="Legal">
                    <ul className="flex flex-wrap gap-x-4 gap-y-2">
                      {legalNav.map((item) => (
                        <li key={item.id}>
                          <Link href={item.href} className="text-[0.8rem] text-muted-foreground/80 underline-offset-4 hover:text-foreground hover:underline">
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                </nav>

                <div className="border-t border-line px-5 py-4">
                  <p className="text-meta uppercase tracking-[0.14em] text-muted-foreground">
                    {new Date().getFullYear()} · TereaCOD Trading L.L.C. · Dubai
                  </p>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
