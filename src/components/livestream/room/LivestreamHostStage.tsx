"use client";

import { MonitorUp } from "lucide-react";
import type { TrackReference } from "@livekit/components-core";
import { LivestreamAudienceSignals } from "@/components/livestream/LivestreamAudienceSignals";
import { MuteIndicator } from "@/components/livestream/MuteIndicator";
import { LiveKitParticipantGallery } from "@/components/livekit/LiveKitParticipantGallery";
import { LiveKitVideoTile } from "@/components/livekit/LiveKitVideoTile";
import type { MeetingParticipant } from "@/hooks/useMeetingPresence";
import type { RemoteParticipant } from "livekit-client";

type HostSelfTile = {
  participantIdentity: string;
  name: string;
  avatarUrl: string | null;
  trackRef?: TrackReference;
  cameraOff: boolean;
  micOn: boolean;
};

type Props = {
  meetingTitle: string;
  viewerCount: number;
  isLive: boolean;
  isConnecting?: boolean;
  isScreenSharing: boolean;
  isCameraOff: boolean;
  isMuted: boolean;
  error: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  hostMainTrack?: TrackReference;
  hostSelfTile: HostSelfTile | null;
  remoteParticipants: RemoteParticipant[];
  participants: MeetingParticipant[];
  hostId: string;
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
  isConnecting = false,
  isScreenSharing,
  isCameraOff,
  isMuted,
  error,
  userId,
  userName,
  avatarUrl,
  hostMainTrack,
  hostSelfTile,
  remoteParticipants,
  participants,
  hostId,
  memberVideoEnabled,
  memberMicEnabled,
  raisedHands,
  thumbsUp,
  thumbsDown,
}: Props) {
  const hasHostVideo = !!hostMainTrack?.publication?.track;
  const showCameraOff = isLive && isCameraOff && !isScreenSharing;
  const waitingForVideo = isLive && !showCameraOff && !hasHostVideo && !isScreenSharing;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
        {isScreenSharing && (
          <LiveKitParticipantGallery
            remoteParticipants={remoteParticipants}
            participants={participants}
            hostId={hostId}
            hostSelfTile={hostSelfTile}
            memberVideoEnabled={memberVideoEnabled}
            memberMicEnabled={memberMicEnabled}
            layout="sidebar"
            side="left"
          />
        )}

        <div
          className={`relative min-h-0 min-w-0 flex-1 overflow-hidden ${
            showCameraOff ? "bg-burgundy-deep" : "bg-black"
          }`}
        >
          <LiveKitVideoTile
            trackRef={hostMainTrack}
            userId={userId}
            name={userName}
            avatarUrl={avatarUrl}
            cameraOff={showCameraOff}
            waitingForVideo={waitingForVideo}
            videoClassName="h-full w-full object-contain"
          />
          {!isScreenSharing && <MuteIndicator visible={isMuted} />}
          {!isLive && !error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-burgundy-deep/90">
              <p className="font-serif text-gold-light">
                {isConnecting ? "Connecting video…" : "Waiting for video connection…"}
              </p>
            </div>
          )}
          <LivestreamAudienceSignals
            raisedHands={raisedHands}
            thumbsUp={thumbsUp}
            thumbsDown={thumbsDown}
          />
        </div>

        {!isScreenSharing && (
          <LiveKitParticipantGallery
            remoteParticipants={remoteParticipants}
            participants={participants}
            hostId={hostId}
            hostSelfTile={hostSelfTile}
            memberVideoEnabled={memberVideoEnabled}
            memberMicEnabled={memberMicEnabled}
            layout="sidebar"
            side="right"
          />
        )}
      </div>
    </div>
  );
}
