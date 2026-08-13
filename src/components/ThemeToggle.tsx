"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applySiteTheme, readSiteTheme, type SiteTheme } from "@/lib/theme";

type Props = {
  className?: string;
};

/** Toggles burgundy/sepia palette — dark mode swaps the two. */
export function ThemeToggle({ className = "" }: Props) {
  const [theme, setTheme] = useState<SiteTheme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(readSiteTheme());
    setReady(true);
  }, []);

  function toggleTheme() {
    const next: SiteTheme = theme === "dark" ? "light" : "dark";
    applySiteTheme(next);
    setTheme(next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-cream-dark/80 text-burgundy transition hover:border-gold hover:bg-gold/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${className}`}
    >
      {ready && isDark ? (
        <Sun className="h-[1.125rem] w-[1.125rem]" aria-hidden />
      ) : (
        <Moon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
      )}
    </button>
  );
}
