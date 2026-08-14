"use client";

import { useEffect, useMemo, useState } from "react";

export const MESSAGE_PAGE_SIZE = 25;

export function useMessagePagination<T>(messages: T[], threadKey: string | null) {
  const total = messages.length;
  const totalPages = Math.max(1, Math.ceil(total / MESSAGE_PAGE_SIZE));

  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(totalPages);
  }, [threadKey, totalPages]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedMessages = useMemo(() => {
    const start = (page - 1) * MESSAGE_PAGE_SIZE;
    return messages.slice(start, start + MESSAGE_PAGE_SIZE);
  }, [messages, page]);

  const onLatestPage = page >= totalPages;

  return {
    page,
    setPage,
    totalPages,
    total,
    paginatedMessages,
    onLatestPage,
    pageSize: MESSAGE_PAGE_SIZE,
  };
}
