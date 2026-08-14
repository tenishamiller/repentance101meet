"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ListPagination } from "./ListPagination";

export const ADMIN_LIST_PAGE_SIZE = 10;

type Props<T> = {
  items: T[];
  pageSize?: number;
  maxHeightClass?: string;
  className?: string;
  listClassName?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => string;
  emptyMessage?: React.ReactNode;
};

export function PaginatedScrollList<T>({
  items,
  pageSize = ADMIN_LIST_PAGE_SIZE,
  maxHeightClass = "max-h-[32rem]",
  className,
  listClassName,
  renderItem,
  getKey,
  emptyMessage,
}: Props<T>) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (items.length === 0) {
    return emptyMessage ? <>{emptyMessage}</> : null;
  }

  return (
    <div className={className}>
      <div className={cn(maxHeightClass, "overflow-y-auto chat-scroll pr-1")}>
        <div className={listClassName}>
          {pagedItems.map((item, index) => {
            const absoluteIndex = (page - 1) * pageSize + index;
            return (
              <div key={getKey(item, absoluteIndex)}>{renderItem(item, absoluteIndex)}</div>
            );
          })}
        </div>
      </div>
      <ListPagination
        page={page}
        totalPages={totalPages}
        total={items.length}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
