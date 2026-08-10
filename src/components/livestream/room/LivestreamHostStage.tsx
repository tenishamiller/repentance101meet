"use client";

import { MonitorUp } from "lucide-react";
import { CameraOffOverlay } from "@/components/livestream/CameraOffOverlay";
import { LivestreamAudienceSignals } from "@/components/livestream/LivestreamAudienceSignals";
import { MuteIndicator } from "@/components/livestream/MuteIndicator";
import { ParticipantGallery } from "@/components/livestream/ParticipantGallery";
import type { GalleryMember } from "@/hooks/useLivestream";

type Props = {
  meetingTitle: string;
  viewerCount: number;
  isLive: boolean;
  isScreenSharing: boolean;
  isCameraOff: boolean;
  isMuted: boolean;
  error: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  hostSelfTile: GalleryMember | null;
  galleryMembers: GalleryMember[];
  memberVideoEnabled: boolean;
  memberMicEnabled: boolean;
  raisedHands: { userId: string; name: string }[];
  thumbsUp: number;
  thumbsDown: number;
};

export function LivestreamHostStage({
  meetingTitle,
  viewerCount,
  isLive,
  isScreenSharing,
  isCameraOff,
  isMuted,
  error,
  userId,
  userName,
  avatarUrl,
  localVideoRef,
  hostSelfTile,
  galleryMembers,
  memberVideoEnabled,
  memberMicEnabled,
  raisedHands,
  thumbsUp,
  thumbsDown,
}: Props) {
  return (
    <>
      <div className="shrink-0 border-b border-gold/30 bg-burgundy px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-serif text-sm font-semibold text-cream sm:text-base">
              {meetingTitle}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gold-light/80">
              {isLive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-burgundy-dark px-2 py-0.5 font-bold text-gold">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                  LIVE
                </span>
              )}
              {isScreenSharing && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 font-semibold text-cream">
                  <MonitorUp className="h-3 w-3" />
                  Sharing screen
                </span>
              )}
              <span>{viewerCount} watching</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-contain ${
              isCameraOff && !isScreenSharing ? "hidden" : ""
            }`}
          />
          {isLive && isCameraOff && !isScreenSharing && (
            <CameraOffOverlay userId={userId} name={userName} avatarUrl={avatarUrl} />
          )}
          <MuteIndicator visible={isMuted} />
          {!isLive && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-burgundy-deep/90">
              <p className="font-serif text-gold-light">Starting camera...</p>
            </div>
          )}
          <LivestreamAudienceSignals
            raisedHands={raisedHands}
            thumbsUp={thumbsUp}
            thumbsDown={thumbsDown}
          />
        </div>

        <ParticipantGallery
          hostTile={hostSelfTile}
          members={galleryMembers}
          memberVideoEnabled={memberVideoEnabled}
          memberMicEnabled={memberMicEnabled}
          layout="sidebar"
        />
      </div>
    </>
  );
}
