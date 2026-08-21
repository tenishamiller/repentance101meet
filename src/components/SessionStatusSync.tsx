"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

/** Keeps JWT in sync when an admin approves, rejects, or removes a member mid-session. */
export function SessionStatusSync() {
  const { data: session, status, update } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    async function refreshStatus() {
      const res = await fetch("/api/onboarding/status");
      if (res.status === 401 || res.status === 404) {
        await signOut({ redirect: true });
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (data.deleted || data.status === "REJECTED") {
        await signOut({ redirect: true });
        return;
      }
      if (session?.user?.status === "PENDING" && data.status === "APPROVED") {
        await update({ status: "APPROVED" });
      }
    }

    void refreshStatus();
    const interval = setInterval(() => void refreshStatus(), 10_000);
    return () => clearInterval(interval);
  }, [session?.user?.status, status, update]);

  return null;
}
