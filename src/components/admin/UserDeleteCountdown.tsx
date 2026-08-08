"use client";

import { useEffect, useState } from "react";
import { formatUserDeleteCountdown } from "@/lib/user-deletion-shared";

export function UserDeleteCountdown({ purgeAt }: { purgeAt: string }) {
  const [label, setLabel] = useState(() => formatUserDeleteCountdown(purgeAt));

  useEffect(() => {
    setLabel(formatUserDeleteCountdown(purgeAt));
    const timer = window.setInterval(() => {
      setLabel(formatUserDeleteCountdown(purgeAt));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [purgeAt]);

  return <span>{label}</span>;
}
