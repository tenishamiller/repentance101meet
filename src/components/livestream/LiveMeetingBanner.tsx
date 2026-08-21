"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LiveInfo = {
  title: string;
  linkToken: string;
};

type Props = {
  initialLive?: LiveInfo | null;
  joinHref?: string;
  className?: string;
};

export function LiveMeetingBanner({
  initialLive = null,
  joinHref,
  className = "",
}: Props) {
  const [live, setLive] = useState<LiveInfo | null>(initialLive);

  useEffect(() => {
    setLive(initialLive);
  }, [initialLive]);

  useEffect(() => {
    async function poll() {
      const res = await fetch("/api/meetings/live-status");
      if (!res.ok) return;
      const data = await res.json();
      setLive(data.live ?? null);
    }

    void poll();
    const interval = setInterval(() => void poll(), 8000);
    return () => clearInterval(interval);
  }, []);

  if (!live) return null;

  const href = joinHref ?? `/meeting/${live.linkToken}`;

  return (
    <div
      className={`rounded-2xl border-2 border-gold/50 bg-gold/10 p-6 ${className}`}
    >
      <p className="badge-live mb-2 w-fit">● LIVE NOW</p>
      <p className="font-semibold text-burgundy">{live.title}</p>
      <p className="mt-1 text-sm text-burgundy/70">A live teaching session is in progress.</p>
      <p className="mt-2 text-xs text-burgundy/60">
        You join with camera and microphone off. Turn them on in the meeting if you want to be seen
        or heard.
      </p>
      <Link href={href} className="btn-burgundy mt-4 inline-block !px-5 !py-2.5 text-sm">
        Join Meeting
      </Link>
    </div>
  );
}
