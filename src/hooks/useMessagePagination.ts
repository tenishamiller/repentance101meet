"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export const MESSAGE_PAGE_SIZE = 80;

export function useMessagePagination<T>(messages: T[], threadKey: string | null) {
  const total = messages.length;
  const totalPages = Math.max(1, Math.ceil(total / MESSAGE_PAGE_SIZE));

  const [page, setPageState] = useState(totalPages);
  const followLatestRef = useRef(true);
  const threadKeyRef = useRef(threadKey);

  if (threadKey !== threadKeyRef.current) {
    threadKeyRef.current = threadKey;
    followLatestRef.current = true;
  }

  useEffect(() => {
    if (followLatestRef.current) {
      setPageState(totalPages);
      return;
    }
    if (page > totalPages) setPageState(totalPages);
  }, [page, totalPages]);

  function setPage(next: number) {
    const clamped = Math.min(totalPages, Math.max(1, next));
    followLatestRef.current = clamped >= totalPages;
    setPageState(clamped);
  }

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
