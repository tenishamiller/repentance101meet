"use client";

import { useEffect, useRef } from "react";
import { VideoTrack } from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-core";
import {
  CameraOffOverlay,
  VideoLoadingOverlay,
} from "@/components/livestream/CameraOffOverlay";
import {
  applyMainStageLowLatency,
  applyPanelRemoteVideo,
  ensureRemoteVideoSubscribed,
} from "@/lib/livekit-latency";
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
  /** Member self-view PiP — circular on desktop, cover-fit video. */
  pipLayout?: boolean;
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
  pipLayout = false,
  lowLatency = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hasTrack = !!trackRef?.publication?.track;
  const showVideo = hasTrack && !cameraOff;
  const resolvedVideoClassName = panelLayout || pipLayout
    ? "h-full w-full object-cover object-center"
    : compact && videoClassName === "h-full w-full object-cover"
      ? "h-full w-full object-contain"
      : videoClassName;
  const videoKey = trackRef
    ? `${trackRef.source}-${trackRef.publication?.trackSid ?? trackRef.publication?.trackName ?? "pending"}`
    : "no-track";

  useEffect(() => {
    ensureRemoteVideoSubscribed(trackRef?.publication);
  }, [trackRef?.publication]);

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

  useEffect(() => {
    if (!showVideo) return;
    const root = rootRef.current;
    if (!root) return;

    const bind = (video: HTMLVideoElement) => {
      video.controls = false;
      video.removeAttribute("controls");
      video.playsInline = true;
      video.autoplay = true;
      video.disablePictureInPicture = true;
      void video.play().catch(() => {
        /* autoplay can be blocked until a click; LiveKit retries on attach */
      });
    };

    const videos = root.querySelectorAll("video");
    videos.forEach((video) => bind(video));

    const observer = new MutationObserver(() => {
      root.querySelectorAll("video").forEach((video) => bind(video));
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [showVideo, videoKey]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative h-full min-h-0 w-full overflow-hidden bg-black",
        lowLatency && "livekit-main-stage-low-latency",
        className,
      )}
    >
      {showVideo && trackRef ? (
        <VideoTrack
          key={videoKey}
          trackRef={trackRef}
          className={resolvedVideoClassName}
          playsInline
          controls={false}
          disablePictureInPicture
          manageSubscription
        />
      ) : cameraOff ? (
        <CameraOffOverlay
          userId={userId}
          name={name}
          avatarUrl={avatarUrl ?? null}
          compact={compact || panelLayout}
          pipLayout={pipLayout}
          showName={!panelLayout && !pipLayout}
        />
      ) : waitingForVideo || !hasTrack ? (
        <VideoLoadingOverlay label={waitingForVideo ? "Starting camera…" : "Waiting for video…"} />
      ) : (
        <CameraOffOverlay
          userId={userId}
          name={name}
          avatarUrl={avatarUrl ?? null}
          compact={compact || panelLayout}
          pipLayout={pipLayout}
          showName={!panelLayout && !pipLayout}
        />
      )}
    </div>
  );
}
