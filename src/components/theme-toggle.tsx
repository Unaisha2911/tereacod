"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * ThemeToggle — flips the whole site (storefront and admin) between the
 * dark brand default and the daylight theme. Shows the icon for the
 * action available right now: a sun while dark ("switch to light"), a
 * moon while light.
 *
 * The icon is theme-dependent output, so it MUST stay stable until after
 * hydration: next-themes resolves the stored theme on the client's first
 * render while the server always renders the dark default — rendering a
 * different icon pre-mount would be a hydration mismatch. We therefore
 * pin the sun icon (dark-brand assumption) until mounted.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Canonical post-hydration gate; the mounted flag must flip in an effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme !== "light" : true;
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-glow/60 ${className}`}
    >
      {isDark ? (
        <Sun className="size-[1.15rem]" aria-hidden="true" />
      ) : (
        <Moon className="size-[1.15rem]" aria-hidden="true" />
      )}
    </button>
  );
}
