"use client";

import { VideoTrack } from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-core";
import {
  CameraOffOverlay,
  VideoLoadingOverlay,
} from "@/components/livestream/CameraOffOverlay";
import { cn } from "@/lib/utils";

type Props = {
  trackRef?: TrackReference;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  cameraOff?: boolean;
  waitingForVideo?: boolean;
  className?: string;
  videoClassName?: string;
  compact?: boolean;
};

export function LiveKitVideoTile({
  trackRef,
  userId,
  name,
  avatarUrl,
  cameraOff = false,
  waitingForVideo = false,
  className,
  videoClassName = "h-full w-full object-cover",
  compact = false,
}: Props) {
  const hasTrack = !!trackRef?.publication?.track;
  const showVideo = hasTrack && !cameraOff;

  return (
    <div className={cn("relative h-full min-h-0 w-full overflow-hidden bg-black", className)}>
      {showVideo && trackRef ? (
        <VideoTrack trackRef={trackRef} className={videoClassName} />
      ) : cameraOff ? (
        <CameraOffOverlay
          userId={userId}
          name={name}
          avatarUrl={avatarUrl ?? null}
          compact={compact}
        />
      ) : waitingForVideo || !hasTrack ? (
        <VideoLoadingOverlay label={waitingForVideo ? "Starting camera…" : "Waiting for video…"} />
      ) : (
        <CameraOffOverlay
          userId={userId}
          name={name}
          avatarUrl={avatarUrl ?? null}
          compact={compact}
        />
      )}
    </div>
  );
}
