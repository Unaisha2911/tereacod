"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionPanel {
  id: string;
  title: string;
  content: React.ReactNode;
  disabled?: boolean;
  /** Extra classes for the panel wrapper — lets callers hide a panel at
   *  specific breakpoints (e.g. when its content is rendered inline elsewhere). */
  className?: string;
}

/**
 * InformationAccordion — accessible expandable panels
 * (description, specifications, compatibility, safety, compliance…).
 * `headingLevel` lets list pages keep a correct document outline
 * (e.g. h2 on pages whose h1 is the page title, h3 inside sections).
 *
 * `defaultOpen` accepts either:
 *  - a single panel id → single-open behaviour (opening one panel closes
 *    the others), used by the help/safety pages, or
 *  - an array of panel ids → each panel toggles independently and every
 *    listed panel starts expanded (used by the product page so description
 *    and specifications are both open by default).
 */
export function InformationAccordion({
  panels,
  defaultOpen,
  headingLevel = "h3",
  className,
}: {
  panels: AccordionPanel[];
  defaultOpen?: string | string[];
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  const HeadingTag = headingLevel;
  const multiple = Array.isArray(defaultOpen);

  const panelItems = panels.map((panel) => (
    <Accordion.Item
      key={panel.id}
      value={panel.id}
      className={cn(
        "overflow-hidden rounded-2xl border border-line bg-elevated/40 transition-colors data-[state=open]:border-violet-glow/30",
        panel.className,
      )}
    >
      <HeadingTag className="flex">
        <Accordion.Trigger
          disabled={panel.disabled}
          className={cn(
            "group flex min-h-14 w-full flex-1 items-center justify-between gap-4 px-5 py-4 text-left font-display text-[0.95rem] font-semibold text-foreground transition-colors hover:bg-foreground/[0.03]",
            panel.disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {panel.title}
          {!panel.disabled && (
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          )}
        </Accordion.Trigger>
      </HeadingTag>
      <Accordion.Content className="overflow-hidden data-[state=closed]:hidden">
        <div className="border-t border-line px-5 py-5 text-[0.9rem] leading-relaxed text-muted-foreground">
          {panel.content}
        </div>
      </Accordion.Content>
    </Accordion.Item>
  ));

  // Radix types the Root props discriminatorily on `type`, so the two
  // modes are rendered as separate branches with the shared panel markup.
  if (multiple) {
    return (
      <Accordion.Root
        type="multiple"
        defaultValue={defaultOpen}
        className={cn("space-y-3", className)}
      >
        {panelItems}
      </Accordion.Root>
    );
  }

  return (
    <Accordion.Root
      type="single"
      collapsible
      defaultValue={defaultOpen}
      className={cn("space-y-3", className)}
    >
      {panelItems}
    </Accordion.Root>
  );
}
