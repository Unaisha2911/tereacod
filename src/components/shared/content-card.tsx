import Link from "next/link";
import { ArrowUpRight, FileText, Globe } from "lucide-react";
import { GlowSurface } from "@/components/atmosphere/glow-surface";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { cn } from "@/lib/utils";

/**
 * ContentCard — configurable navigation card for informational
 * destinations (homepage discover grid, help hub, compliance links).
 */
export function ContentCard({
  title,
  body,
  href,
  icon: Icon,
  index = 0,
  className,
}: {
  title: string;
  body?: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  index?: number;
  className?: string;
}) {
  return (
    <RevealSection delay={Math.min(index * 0.06, 0.36)} className={cn("h-full", className)}>
      <GlowSurface className="h-full rounded-2xl border border-line bg-elevated/45 transition-colors duration-300 hover:border-violet-glow/40">
        <Link href={href} className="flex h-full min-h-40 flex-col gap-3 p-5 sm:p-6" aria-label={title}>
          {Icon && (
            <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-foreground/[0.04] text-violet-soft">
              <Icon className="size-[1.15rem]" aria-hidden="true" />
            </span>
          )}
          <div className="mt-auto flex items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-[1.05rem] font-semibold text-foreground">{title}</h3>
              {body && <p className="mt-1 text-[0.83rem] leading-relaxed text-muted-foreground">{body}</p>}
            </div>
            <ArrowUpRight className="mb-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover/glow:-translate-y-0.5 group-hover/glow:translate-x-0.5 group-hover/glow:text-foreground" aria-hidden="true" />
          </div>
        </Link>
      </GlowSurface>
    </RevealSection>
  );
}

/** DocumentCard — links to conformity/safety/legal documents. */
export function DocumentCard({
  title,
  type,
  href,
  note,
}: {
  title: string;
  type: "pdf" | "web";
  href?: string;
  note?: string;
}) {
  const Icon = type === "pdf" ? FileText : Globe;
  const body = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-foreground/[0.04] text-ice">
        <Icon className="size-[1.05rem]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">
          {type === "pdf" ? "PDF document" : "Web page"}
          {note ? ` · ${note}` : ""}
        </span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </>
  );

  const shell = "flex items-center gap-4 rounded-2xl border border-line bg-elevated/40 px-4 py-3.5 transition-colors hover:border-ice/40 hover:bg-elevated/70";

  if (!href) {
    // No link on file — the document is shared on request.
    return (
      <div className={`${shell} cursor-not-allowed opacity-60`} aria-disabled="true" title="Document available on request">
        {body}
      </div>
    );
  }
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={shell}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href} className={shell}>
      {body}
    </Link>
  );
}
