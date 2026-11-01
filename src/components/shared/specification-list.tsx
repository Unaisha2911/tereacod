import type { SpecificationGroup } from "@/types";

/** SpecificationList — definition-list presentation of spec groups. */
export function SpecificationList({ groups }: { groups: SpecificationGroup[] }) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Specifications for this record have not been published yet.</p>;
  }
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.title}>
          <h4 className="text-label font-semibold uppercase tracking-[0.18em] text-violet-soft">{group.title}</h4>
          <dl className="mt-3 divide-y divide-[color:var(--line)] overflow-hidden rounded-2xl border border-line">
            {group.entries.map((entry) => (
              <div key={entry.label} className="grid grid-cols-[1fr_1.2fr] gap-4 bg-foreground/[0.015] px-4 py-3 text-sm sm:grid-cols-[1fr_1.6fr] sm:px-5">
                <dt className="text-muted-foreground">{entry.label}</dt>
                <dd className="font-medium text-foreground">{entry.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
