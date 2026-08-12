"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  primary: React.ReactNode;
  secondary: React.ReactNode;
  secondaryLabel?: string;
  badge?: number;
  /** When this value changes, snap back to the primary (video) panel. */
  snapPrimaryKey?: string | number;
};

/** Two-page horizontal snap: video (default) and swipe-left secondary panel (mobile only). */
export function MobileSwipePanels({
  primary,
  secondary,
  secondaryLabel = "In room",
  badge,
  snapPrimaryKey,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const prevSnapKey = useRef(snapPrimaryKey);

  useEffect(() => {
    if (snapPrimaryKey === undefined) return;
    if (prevSnapKey.current === snapPrimaryKey) return;
    prevSnapKey.current = snapPrimaryKey;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "auto" });
    setPage(0);
  }, [snapPrimaryKey]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      setPage(Math.round(el.scrollLeft / width));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="h-full w-full shrink-0 snap-start overflow-hidden">{primary}</div>
        <div className="flex h-full w-full shrink-0 snap-start flex-col overflow-hidden bg-burgundy-dark">
          {secondary}
        </div>
      </div>

      {page === 0 && (
        <div
          className="pointer-events-none absolute bottom-14 right-0 z-20"
          aria-hidden
        >
          <div className="flex items-center gap-0.5 rounded-l-lg border border-r-0 border-gold/30 bg-burgundy-dark/90 py-2 pl-1 pr-2.5 text-[10px] font-semibold uppercase tracking-wide text-gold-light/80 shadow-lg backdrop-blur">
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
            <span>
              {secondaryLabel}
              {badge != null && badge > 0 ? ` · ${badge}` : ""}
            </span>
          </div>
        </div>
      )}

      <div
        className="pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1.5"
        aria-hidden
      >
        {[0, 1].map((index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-all",
              page === index ? "w-4 bg-gold" : "w-1.5 bg-gold/35",
            )}
          />
        ))}
      </div>
    </div>
  );
}
