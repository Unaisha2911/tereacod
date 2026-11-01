import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * SeoContent — below-the-fold editorial content on listing pages.
 *
 * Sits directly under the product grid / Load more control so crawlers
 * index keyword-rich copy (TEREA delivery, cash on delivery, origin
 * lines…) on every paginated listing without pushing products down.
 * Server-compatible (no hooks) so it renders in the SSR HTML pass.
 */
export interface SeoContentLink {
  label: string;
  href: string;
  description?: string;
}

export interface SeoContentBlock {
  heading: string;
  paragraphs: string[];
}

export function SeoContent({
  title,
  blocks,
  links,
  linksAriaLabel = "Related pages",
  className,
}: {
  /** Section heading (h2). */
  title: string;
  /** Copy blocks — each renders an h3 + paragraphs. */
  blocks: SeoContentBlock[];
  /** Internal link cards rendered after the copy (crawl paths). */
  links?: SeoContentLink[];
  linksAriaLabel?: string;
  className?: string;
}) {
  return (
    <section aria-label={title} className={`mt-16 border-t border-line pt-10 ${className ?? ""}`}>
      <div className="max-w-3xl">
        <h2 className="font-display text-h3 font-semibold text-foreground">{title}</h2>
        {blocks.map((block) => (
          <div key={block.heading} className="pt-7">
            <h3 className="font-display text-[1.05rem] font-semibold text-foreground">{block.heading}</h3>
            {block.paragraphs.map((paragraph, i) => (
              <p key={i} className="mt-3 text-[0.9rem] leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </div>

      {links && links.length > 0 && (
        <nav aria-label={linksAriaLabel} className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-start justify-between gap-3 rounded-2xl border border-line bg-elevated/40 p-4 transition-colors hover:border-violet-glow/40"
            >
              <span>
                <span className="block text-[0.92rem] font-semibold text-foreground">{link.label}</span>
                {link.description && (
                  <span className="mt-1 block text-[0.78rem] leading-relaxed text-muted-foreground">
                    {link.description}
                  </span>
                )}
              </span>
              <ArrowUpRight
                className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}
