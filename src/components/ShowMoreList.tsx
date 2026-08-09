"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props<T> = {
  items: T[];
  initialCount?: number;
  step?: number;
  maxHeightClass?: string;
  className?: string;
  listClassName?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => string;
  emptyMessage?: React.ReactNode;
  moreLabel?: string;
};

export function ShowMoreList<T>({
  items,
  initialCount = 5,
  step = 5,
  maxHeightClass = "max-h-[28rem]",
  className,
  listClassName,
  renderItem,
  getKey,
  emptyMessage,
  moreLabel = "more",
}: Props<T>) {
  const [visibleCount, setVisibleCount] = useState(initialCount);

  useEffect(() => {
    setVisibleCount((count) => Math.min(Math.max(initialCount, count), items.length || initialCount));
  }, [items.length, initialCount]);

  if (items.length === 0) {
    return emptyMessage ? <>{emptyMessage}</> : null;
  }

  const visible = items.slice(0, visibleCount);
  const hiddenCount = items.length - visibleCount;
  const canShowMore = hiddenCount > 0;
  const canShowLess = visibleCount > initialCount;
  const scrollWhenLong = visibleCount >= items.length && items.length > initialCount;

  return (
    <div className={className}>
      <div
        className={cn(
          listClassName,
          scrollWhenLong && `${maxHeightClass} chat-scroll pr-1`,
        )}
      >
        {visible.map((item, index) => (
          <div key={getKey(item, index)}>{renderItem(item, index)}</div>
        ))}
      </div>

      {(canShowMore || canShowLess) && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {canShowMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => Math.min(items.length, count + step))}
              className="inline-flex items-center gap-1 text-sm font-semibold text-gold-muted hover:underline"
            >
              <ChevronDown className="h-4 w-4" />
              Show {Math.min(step, hiddenCount)} {moreLabel}
              <span className="font-normal text-burgundy/50">({hiddenCount} hidden)</span>
            </button>
          )}
          {canShowLess && (
            <button
              type="button"
              onClick={() => setVisibleCount(initialCount)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-burgundy/60 hover:text-burgundy"
            >
              <ChevronUp className="h-4 w-4" />
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
}
