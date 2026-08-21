"use client";

import type { TrackReference } from "@livekit/components-core";
import { LiveKitVideoTile } from "@/components/livekit/LiveKitVideoTile";
import { MuteIndicator } from "@/components/livestream/MuteIndicator";

type Props = {
  trackRef?: TrackReference;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  cameraOff: boolean;
  muted?: boolean;
};

/**
 * Host webcam overlay while screen sharing. Mobile keeps this on the share
 * stage so members (and the host) do not have to swipe to In room.
 */
export function HostShareCameraPip({
  trackRef,
  userId,
  name,
  avatarUrl,
  cameraOff,
  muted = false,
}: Props) {
  const hasCamera = Boolean(trackRef?.publication?.track) && !cameraOff;

  return (
    <div
      className="pointer-events-none absolute bottom-2 right-2 z-20 h-[7.25rem] w-[5.25rem] overflow-hidden rounded-xl border-2 border-gold/55 bg-burgundy-dark shadow-xl sm:bottom-3 sm:right-3 sm:h-40 sm:w-28"
      aria-label={`${name} camera`}
    >
      <LiveKitVideoTile
        trackRef={trackRef}
        userId={userId}
        name={name}
        avatarUrl={avatarUrl}
        cameraOff={!hasCamera}
        compact
        panelLayout
        className="h-full w-full"
      />
      <p className="absolute inset-x-0 bottom-0 truncate bg-burgundy-dark/85 px-1.5 py-0.5 text-[10px] font-semibold text-gold-light">
        {name}
      </p>
      <MuteIndicator visible={muted} compact className="bottom-6 left-1" />
    </div>
  );
}
