"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/** Keeps JWT status in sync when an admin approves a pending member mid-session. */
export function SessionStatusSync() {
  const { data: session, status, update } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.status !== "PENDING") return;

    async function refreshStatus() {
      const res = await fetch("/api/onboarding/status");
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "APPROVED") {
        await update({ status: "APPROVED" });
      }
    }

    void refreshStatus();
    const interval = setInterval(() => void refreshStatus(), 10_000);
    return () => clearInterval(interval);
  }, [session?.user?.status, status, update]);

  return null;
}
