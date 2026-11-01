import { cn } from "@/lib/utils";
import { RevealSection } from "@/components/atmosphere/reveal-section";

/**
 * PageHeading — consistent page header block: eyebrow, title, lead,
 * optional actions and atmosphere hairline.
 */
export function PageHeading({
  eyebrow,
  title,
  lead,
  actions,
  className,
  align = "start",
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  actions?: React.ReactNode;
  className?: string;
  align?: "start" | "center";
}) {
  return (
    <RevealSection
      variant="fadeUp"
      className={cn(
        "flex flex-col gap-4 pb-10 pt-12 sm:pt-16",
        align === "center" && "items-center text-center",
        className
      )}
    >
      {eyebrow && (
        <p className="text-label font-medium uppercase tracking-[0.22em] text-violet-soft">{eyebrow}</p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className={cn("text-h1 font-bold", align === "center" && "max-w-2xl")}>{title}</h1>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
      {lead && <p className={cn("max-w-2xl text-lead text-muted-foreground", align === "center" && "mx-auto")}>{lead}</p>}
    </RevealSection>
  );
}
