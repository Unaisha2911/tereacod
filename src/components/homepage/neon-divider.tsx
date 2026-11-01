/**
 * NeonDivider — LED-tube hairline with a quartet of charging
 * indicator dots (violet, ice, red, magenta). Used to separate major
 * homepage bands.
 * Positioning (relative/absolute) is supplied by the caller via className.
 */
export function NeonDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center gap-3 ${className ?? ""}`}>
      <span className="neon-divider h-px flex-1" />
      <span className="flex items-center gap-1.5">
        <span className="anim-led size-1 rounded-full bg-violet-soft text-violet-soft" style={{ ["--dur" as string]: "2.2s" }} />
        <span className="anim-led size-1 rounded-full bg-ice text-ice" style={{ ["--dur" as string]: "2.2s", ["--delay" as string]: "0.4s" }} />
        <span className="anim-led size-1 rounded-full bg-led-red text-led-red" style={{ ["--dur" as string]: "2.2s", ["--delay" as string]: "0.8s" }} />
        <span className="anim-led size-1 rounded-full bg-magenta-glow text-magenta-glow" style={{ ["--dur" as string]: "2.2s", ["--delay" as string]: "1.2s" }} />
      </span>
      <span className="neon-divider h-px flex-1" />
    </div>
  );
}
