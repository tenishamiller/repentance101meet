"use client";

import { Mic, MicOff } from "lucide-react";

type Props = {
  name: string;
  muted: boolean;
};

/** Name + mic status row under participant tiles in the In room sidebar. */
export function ParticipantPanelNameRow({ name, muted }: Props) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 border-t border-gold/10 bg-burgundy-dark px-2 py-1.5">
      <span className="truncate text-xs font-semibold text-gold-light">{name}</span>
      {muted ? (
        <MicOff className="h-3.5 w-3.5 shrink-0 text-gold-light/80" aria-label="Muted" />
      ) : (
        <Mic className="h-3.5 w-3.5 shrink-0 text-gold/70" aria-label="Mic on" />
      )}
    </div>
  );
}
