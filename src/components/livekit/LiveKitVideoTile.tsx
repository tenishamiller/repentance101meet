"use client";

import { useEffect } from "react";
import { VideoTrack } from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-core";
import {
  CameraOffOverlay,
  VideoLoadingOverlay,
} from "@/components/livestream/CameraOffOverlay";
import { applyMainStageLowLatency, applyPanelRemoteVideo } from "@/lib/livekit-latency";
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
  /** Sidebar tile: avatar in video area, name on the row below. */
  panelLayout?: boolean;
  /** Main-stage remote video (host feed for members) — lower playback delay. */
  lowLatency?: boolean;
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
  panelLayout = false,
  lowLatency = false,
}: Props) {
  const hasTrack = !!trackRef?.publication?.track;
  const showVideo = hasTrack && !cameraOff;
  const resolvedVideoClassName = panelLayout
    ? "h-full w-full object-cover object-center"
    : compact && videoClassName === "h-full w-full object-cover"
      ? "h-full w-full object-contain"
      : videoClassName;
  const videoKey = trackRef
    ? `${trackRef.source}-${trackRef.publication?.trackSid ?? trackRef.publication?.trackName ?? "pending"}`
    : "no-track";

  useEffect(() => {
    if (!trackRef?.publication) return;

    if (panelLayout) {
      applyPanelRemoteVideo(trackRef.publication);
      const onSubscribed = () => applyPanelRemoteVideo(trackRef.publication);
      trackRef.publication.on("subscribed", onSubscribed);
      return () => {
        trackRef.publication?.off("subscribed", onSubscribed);
      };
    }

    if (!lowLatency) return;

    applyMainStageLowLatency(trackRef.publication);

    const onSubscribed = () => applyMainStageLowLatency(trackRef.publication);
    trackRef.publication.on("subscribed", onSubscribed);
    return () => {
      trackRef.publication?.off("subscribed", onSubscribed);
    };
  }, [lowLatency, panelLayout, trackRef]);

  return (
    <div className={cn("relative h-full min-h-0 w-full overflow-hidden bg-black", className)}>
      {showVideo && trackRef ? (
        <VideoTrack key={videoKey} trackRef={trackRef} className={resolvedVideoClassName} />
      ) : cameraOff ? (
        <CameraOffOverlay
          userId={userId}
          name={name}
          avatarUrl={avatarUrl ?? null}
          compact={compact || panelLayout}
          showName={!panelLayout}
        />
      ) : waitingForVideo || !hasTrack ? (
        <VideoLoadingOverlay label={waitingForVideo ? "Starting camera…" : "Waiting for video…"} />
      ) : (
        <CameraOffOverlay
          userId={userId}
          name={name}
          avatarUrl={avatarUrl ?? null}
          compact={compact || panelLayout}
          showName={!panelLayout}
        />
      )}
    </div>
  );
}
