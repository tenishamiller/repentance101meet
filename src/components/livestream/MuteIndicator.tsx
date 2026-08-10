"use client";

import { MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  visible: boolean;
  className?: string;
  compact?: boolean;
  label?: string;
};

/** Visible mute badge on a participant's video until they unmute. */
export function MuteIndicator({
  visible,
  className,
  compact = false,
  label = "Muted",
}: Props) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-burgundy-dark/90 text-cream shadow-lg backdrop-blur",
        compact ? "bottom-1.5 left-1.5 px-1.5 py-1" : "bottom-3 left-3 px-2 py-1.5 sm:px-2.5 sm:py-1.5",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <MicOff className={cn("shrink-0 text-gold-light", compact ? "h-3 w-3" : "h-3.5 w-3.5 sm:h-4 sm:w-4")} />
      {!compact && <span className="text-[10px] font-semibold sm:text-xs">{label}</span>}
    </div>
  );
}
