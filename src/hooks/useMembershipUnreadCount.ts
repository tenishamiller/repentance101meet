"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function useMembershipUnreadCount(pollMs = 10000, scope: "all" | "admin" = "all") {
  const { data: session, status } = useSession();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (status !== "authenticated" || !session?.user) {
      setUnread(0);
      return;
    }
    const res = await fetch("/api/messages/unread-count");
    if (!res.ok) return;
    const data = (await res.json()) as {
      unread?: number;
      adminUnread?: number;
      peerUnread?: number;
    };
    if (scope === "admin") {
      setUnread(data.adminUnread ?? 0);
    } else {
      setUnread(data.unread ?? 0);
    }
  }, [scope, session?.user, status]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(interval);
  }, [pollMs, refresh]);

  return { unread, refresh };
}
