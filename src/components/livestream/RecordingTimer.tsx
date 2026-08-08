"use client";

import { formatRecordingDuration } from "@/lib/media-devices";

export function RecordingTimer({ elapsedSeconds }: { elapsedSeconds: number }) {
  return (
    <span className="tabular-nums tracking-wide" aria-live="polite">
      {formatRecordingDuration(elapsedSeconds)}
    </span>
  );
}
