"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function ListPagination({ page, totalPages, total, pageSize, onPageChange }: Props) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-gold/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-burgundy/60">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-gold/30 px-3 py-1.5 text-sm font-semibold text-burgundy transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <span className="px-2 text-sm text-burgundy/70">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-gold/30 px-3 py-1.5 text-sm font-semibold text-burgundy transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
