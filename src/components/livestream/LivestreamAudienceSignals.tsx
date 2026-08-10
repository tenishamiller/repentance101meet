"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";

type RaisedHand = { userId: string; name: string };

type Props = {
  raisedHands: RaisedHand[];
  thumbsUp: number;
  thumbsDown: number;
  className?: string;
};

/** Raised hands and reaction counts visible on host and member video stages. */
export function LivestreamAudienceSignals({
  raisedHands,
  thumbsUp,
  thumbsDown,
  className,
}: Props) {
  const hasSignals = raisedHands.length > 0 || thumbsUp > 0 || thumbsDown > 0;
  if (!hasSignals) return null;

  return (
    <div
      className={`pointer-events-none absolute right-3 top-14 z-10 flex max-w-[min(100%,16rem)] flex-col gap-2 sm:right-4 sm:top-16 ${className ?? ""}`}
    >
      {raisedHands.length > 0 && (
        <div className="rounded-xl border border-gold/40 bg-burgundy-dark/90 px-3 py-2 shadow-lg backdrop-blur">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gold">
            Raised hands
          </p>
          <ul className="mt-1 space-y-0.5">
            {raisedHands.map((p) => (
              <li key={p.userId} className="flex items-center gap-1.5 text-sm text-cream">
                <span className="text-base leading-none" aria-hidden>
                  ✋
                </span>
                {p.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      {(thumbsUp > 0 || thumbsDown > 0) && (
        <div className="flex flex-wrap justify-end gap-2">
          {thumbsUp > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-burgundy-dark/90 px-3 py-1.5 text-sm font-semibold text-cream shadow-lg backdrop-blur">
              <ThumbsUp className="h-4 w-4 text-gold" aria-hidden />
              {thumbsUp}
            </span>
          )}
          {thumbsDown > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-burgundy-dark/90 px-3 py-1.5 text-sm font-semibold text-cream shadow-lg backdrop-blur">
              <ThumbsDown className="h-4 w-4 text-gold-light/80" aria-hidden />
              {thumbsDown}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ParticipantSignalBadge({ emoji, title }: { emoji: string; title: string }) {
  return (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-full border border-gold/40 bg-burgundy-dark/90 text-base shadow backdrop-blur"
      title={title}
      aria-label={title}
    >
      {emoji}
    </span>
  );
}

export function ParticipantSignalBadges({
  handRaised,
  reaction,
  className,
}: {
  handRaised?: boolean;
  reaction?: string | null;
  className?: string;
}) {
  if (!handRaised && !reaction) return null;

  return (
    <div className={`absolute left-1.5 top-1.5 z-10 flex flex-col gap-1 ${className ?? ""}`}>
      {handRaised && <ParticipantSignalBadge emoji="✋" title="Hand raised" />}
      {reaction === "UP" && <ParticipantSignalBadge emoji="👍" title="Thumbs up" />}
      {reaction === "DOWN" && <ParticipantSignalBadge emoji="👎" title="Thumbs down" />}
    </div>
  );
}
