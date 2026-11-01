import { cn } from "@/lib/utils";

/** PageContainer — consistent horizontal rhythm for page content. */
export function PageContainer({ children, className, width = "default" }: {
  children: React.ReactNode;
  className?: string;
  width?: "narrow" | "default" | "wide" | "full";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        width === "narrow" && "max-w-3xl",
        width === "default" && "max-w-6xl",
        width === "wide" && "max-w-7xl",
        width === "full" && "max-w-none",
        className
      )}
    >
      {children}
    </div>
  );
}

/** SectionContainer — vertical rhythm + page gutters between sections. */
export function SectionContainer({ children, className, spacing = "default" }: {
  children: React.ReactNode;
  className?: string;
  spacing?: "sm" | "default" | "lg";
}) {
  return (
    <section className={cn("relative px-4 sm:px-6 lg:px-8", spacing === "sm" && "py-10", spacing === "default" && "py-16 sm:py-20", spacing === "lg" && "py-24 sm:py-32", className)}>
      {children}
    </section>
  );
}
