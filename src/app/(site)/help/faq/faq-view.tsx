"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { SearchField } from "@/components/shared/admin-primitives";
import { EmptyState } from "@/components/shared/empty-state";
import { InformationAccordion } from "@/components/shared/information-accordion";
import { cn } from "@/lib/utils";

/** FAQ record shape served by the server data facade. */
type FaqEntry = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

type CategoryFilter = string;

export function FaqView({
  faqs,
  categories,
}: {
  faqs: FaqEntry[];
  /** Topic filter order, passed in from the server page. */
  categories: readonly string[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  // Deep-link support: /help/faq#device-setup must land on the OPEN
  // question, not a collapsed panel. Read once on mount.
  const [hashedId, setHashedId] = useState<string | null>(null);

  const FILTERS: CategoryFilter[] = ["All", ...categories];

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const match = faqs.find((f) => f.id === hash);
    if (!match) return;
    // One-time deep-link initialisation (e.g. /help/faq#device-setup):
    // narrow the list to the topic and mark the panel open. This cannot
    // run during render (window is unavailable server-side), so the
    // setState-in-effect rule is intentionally waived here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHashedId(hash);
    setCategory(match.category);
  }, [faqs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs.filter(
      (f) =>
        (category === "All" || f.category === category) &&
        (q === "" || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)),
    );
  }, [faqs, query, category]);

  const counts = useMemo(() => {
    const map = new Map<CategoryFilter, number>([["All", faqs.length]]);
    for (const c of categories) {
      map.set(c, faqs.filter((f) => f.category === c).length);
    }
    return map;
  }, [faqs, categories]);

  const clearFilters = () => {
    setQuery("");
    setCategory("All");
  };

  const chipClass = (active: boolean) =>
    cn(
      "min-h-11 rounded-full border px-3.5 text-[0.8rem] font-medium transition-colors",
      active
        ? "border-violet-glow/60 bg-violet-glow/10 text-violet-soft"
        : "border-line bg-foreground/[0.03] text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="grid gap-10 lg:grid-cols-[230px_minmax(0,1fr)]">
      {/* Sidebar topic nav (lg+) */}
      <aside className="hidden lg:block" aria-label="Filter questions by topic">
        <nav className="sticky top-24">
          <p className="text-label font-medium uppercase tracking-[0.18em] text-violet-soft">Topics</p>
          <ul className="mt-4 space-y-1">
            {FILTERS.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[0.85rem] transition-colors",
                    category === c
                      ? "bg-violet-glow/10 text-foreground"
                      : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                  )}
                >
                  <span>{c === "All" ? "All questions" : c}</span>
                  <span className="font-mono text-meta text-muted-foreground">{counts.get(c) ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0">
        <SearchField
          value={query}
          onChange={setQuery}
          label="Search the frequently asked questions"
          placeholder="Search questions and answers…"
          className="max-w-md"
        />

        {/* Category chips (below lg, where the sidebar is hidden) */}
        <div className="mt-4 flex flex-wrap gap-2 lg:hidden" role="group" aria-label="Filter by topic">
          {FILTERS.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c} className={chipClass(category === c)}>
              {c === "All" ? "All" : c}
            </button>
          ))}
        </div>

        <p className="mt-5 text-meta uppercase tracking-[0.14em] text-muted-foreground" aria-live="polite">
          Showing {filtered.length} of {faqs.length} questions
          {category !== "All" ? ` in ${category}` : ""}
        </p>

        {filtered.length > 0 ? (
          <div className="mt-5 space-y-3">
            {filtered.map((faq) => (
              <article key={faq.id} id={faq.id} className="scroll-mt-24">
                <InformationAccordion
                  // Remount with the panel open when this article is the
                  // deep-linked one (defaultValue only applies at mount).
                  key={hashedId === faq.id ? `${faq.id}-open` : faq.id}
                  defaultOpen={hashedId === faq.id ? faq.id : undefined}
                  headingLevel="h2"
                  panels={[
                    {
                      id: faq.id,
                      title: faq.question,
                      content: (
                        <div className="max-w-prose space-y-3">
                          <p>{faq.answer}</p>
                          <p className="text-meta uppercase tracking-[0.16em] text-muted-foreground/80">
                            {faq.category}
                          </p>
                        </div>
                      ),
                    },
                  ]}
                />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={SearchX}
            title="No matches"
            body={
              category === "All"
                ? "No questions match that search. Try a different term."
                : `No questions match that search in ${category}. Try a different term or clear the filters.`
            }
            actionLabel="Clear search and filters"
            onAction={clearFilters}
            className="mt-8"
          />
        )}
      </div>
    </div>
  );
}
