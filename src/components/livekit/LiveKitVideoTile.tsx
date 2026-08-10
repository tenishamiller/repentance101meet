"use client";

import { VideoTrack } from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-core";
import { CameraOffOverlay } from "@/components/livestream/CameraOffOverlay";
import { cn } from "@/lib/utils";

type Props = {
  trackRef?: TrackReference;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  cameraOff?: boolean;
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
  className,
  videoClassName = "h-full w-full object-cover",
  compact = false,
}: Props) {
  const showVideo = !!trackRef?.publication?.track && !cameraOff;

  return (
    <div className={cn("relative overflow-hidden bg-black", className)}>
      {showVideo && trackRef ? (
        <VideoTrack trackRef={trackRef} className={videoClassName} />
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
