"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Printer } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageContainer } from "@/components/layout/page-container";
import type { LegalDocument } from "@/types";
import { cn } from "@/lib/utils";

/**
 * LegalDocumentTemplate — shared renderer for the four legal documents.
 * Client component: sticky TOC with scroll-spy + print button. The
 * rendered document and its sibling links are passed in from the
 * server-rendered legal pages (the server data facade).
 */
export function LegalDocumentTemplate({ doc, otherDocs }: { doc: LegalDocument; otherDocs: LegalDocument[] }) {
  const [activeId, setActiveId] = useState<string>(doc.sections[0]?.id ?? "");

  useEffect(() => {
    const elements = doc.sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -65% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [doc]);

  return (
    <PageContainer width="default" className="pb-16 sm:pb-24">
      <div className="pt-8 sm:pt-10">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Legal" }, { label: doc.title }]} />
      </div>

      <header className="mt-6 max-w-prose">
        <h1 className="text-h1 font-bold text-foreground">{doc.title}</h1>

        <div className="print-plain mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-elevated/40 p-3">
          <MetaChip>Effective {doc.effectiveDate}</MetaChip>
          <MetaChip>Last updated {doc.lastUpdated}</MetaChip>
          <MetaChip>{doc.version}</MetaChip>
        </div>

        <p className="mt-6 text-lead text-muted-foreground">{doc.summary}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-foreground/[0.03] px-4 text-[0.85rem] font-medium text-foreground transition-colors hover:border-violet-glow/50 hover:bg-foreground/[0.06]"
          >
            <Printer className="size-4" aria-hidden="true" />
            Print this document
          </button>
          <span className="text-meta text-muted-foreground">Print-friendly styling is applied automatically.</span>
        </div>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Sticky TOC (lg+) */}
        <aside className="hidden lg:block" aria-label="Table of contents">
          <nav className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <p className="text-label font-medium uppercase tracking-[0.18em] text-violet-soft">Contents</p>
            <ul className="mt-4 border-l border-line">
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={activeId === section.id ? "location" : undefined}
                    className={cn(
                      "-ml-px block border-l-2 py-1.5 pl-4 text-[0.82rem] leading-snug transition-colors",
                      activeId === section.id
                        ? "border-violet-glow text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 max-w-prose">
          {/* Mobile TOC */}
          <details className="print-plain mb-8 rounded-2xl border border-line bg-elevated/40 px-5 py-4 lg:hidden">
            <summary className="cursor-pointer font-display text-[0.95rem] font-semibold text-foreground">
              On this page
            </summary>
            <ul className="mt-3 space-y-1.5">
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-[0.85rem] text-muted-foreground hover:text-foreground">
                    {section.heading}
                  </a>
                </li>
              ))}
            </ul>
          </details>

          <article className="print-plain min-w-0">
            {doc.sections.map((section, i) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-heading`}
                className={cn("scroll-mt-24", i > 0 && "mt-10")}
              >
                <h2 id={`${section.id}-heading`} className="font-display text-h3 font-semibold text-foreground">
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-3">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 48)} className="text-legal leading-[1.65] text-foreground/90">
                      {paragraph}
                    </p>
                  ))}
                  {section.list && (
                    <ul className="list-disc space-y-1.5 pl-5 marker:text-violet-soft">
                      {section.list.map((item) => (
                        <li key={item.slice(0, 48)} className="text-legal leading-[1.65] text-foreground/90">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </article>

          <div className="mt-14 space-y-10">
            <section aria-labelledby="other-legal-heading">
              <h2 id="other-legal-heading" className="font-display text-h3 font-semibold text-foreground">
                Other legal documents
              </h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                {otherDocs.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/legal/${other.slug}`}
                      className="flex h-full items-center gap-3 rounded-2xl border border-line bg-elevated/40 px-4 py-3.5 transition-colors hover:border-violet-glow/40"
                    >
                      <FileText className="size-[1.05rem] shrink-0 text-ice" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{other.title}</span>
                        <span className="mt-0.5 block font-mono text-meta text-muted-foreground">{other.version}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-foreground/[0.03] px-2.5 py-1 font-mono text-meta text-muted-foreground">
      {children}
    </span>
  );
}
