"use client";

import { useEffect } from "react";

/** Poll only while the tab is visible — cuts background load at scale. */
export function useVisibilityPolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void callback();
    };

    tick();
    const interval = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [callback, enabled, intervalMs]);
}
