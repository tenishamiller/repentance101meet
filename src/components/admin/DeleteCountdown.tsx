"use client";

import { useEffect, useState } from "react";
import { formatDeleteCountdown } from "@/lib/meeting-deletion-shared";

export function DeleteCountdown({ purgeAt }: { purgeAt: string }) {
  const [label, setLabel] = useState(() => formatDeleteCountdown(purgeAt));

  useEffect(() => {
    setLabel(formatDeleteCountdown(purgeAt));
    const timer = window.setInterval(() => {
      setLabel(formatDeleteCountdown(purgeAt));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [purgeAt]);

  return <span>{label}</span>;
}
