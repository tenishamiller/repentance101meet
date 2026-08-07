"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";

export function LivestreamEndedBanner() {
  const searchParams = useSearchParams();
  const ended = searchParams.get("ended") === "1";
  const removed = searchParams.get("removed") === "1";

  if (!ended && !removed) return null;

  return (
    <div className="mb-6 rounded-2xl border border-gold/40 bg-gold/10 px-5 py-4 text-burgundy">
      <p className="font-serif text-lg font-bold">
        {removed ? "You left the meeting" : "Thanks for joining the livestream"}
      </p>
      <p className="mt-1 text-sm text-burgundy/80">
        {removed
          ? "You were removed from the session or chose to leave."
          : "The host has ended the live meeting. We hope to see you at the next session."}
      </p>
      <Link
        href="/livestream"
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold-muted hover:underline"
      >
        <X className="h-3.5 w-3.5" />
        Dismiss
      </Link>
    </div>
  );
}
