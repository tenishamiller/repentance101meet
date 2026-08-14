"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  variant?: "light" | "dark";
  compact?: boolean;
};

export function MessagePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  variant = "light",
  compact = false,
}: Props) {
  if (total <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const isDark = variant === "dark";

  const btnClass = isDark
    ? "inline-flex items-center gap-1 rounded-lg border border-gold/30 px-2.5 py-1 text-xs font-semibold text-gold-light transition hover:bg-burgundy disabled:cursor-not-allowed disabled:opacity-40"
    : "inline-flex items-center gap-1 rounded-lg border border-gold/30 px-2.5 py-1 text-xs font-semibold text-burgundy transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40";

  const textClass = isDark ? "text-xs text-gold-light/70" : "text-xs text-burgundy/65";

  return (
    <div
      className={`flex shrink-0 flex-wrap items-center justify-between gap-2 border-b ${
        isDark ? "border-gold/20 bg-burgundy px-3 py-2" : "border-gold/15 bg-cream-dark/80 px-3 py-2"
      } ${compact ? "" : ""}`}
    >
      <p className={textClass}>
        Messages {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={btnClass}
          aria-label="Previous messages page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {!compact && "Older"}
        </button>
        <span className={`px-1 ${textClass}`}>
          {page}/{totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={btnClass}
          aria-label="Next messages page"
        >
          {!compact && "Newer"}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
