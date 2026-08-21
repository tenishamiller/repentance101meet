"use client";

import { MonitorUp } from "lucide-react";
import type { TrackReference } from "@livekit/components-core";
import { LivestreamAudienceSignals } from "@/components/livestream/LivestreamAudienceSignals";
import { MuteIndicator } from "@/components/livestream/MuteIndicator";
import { MobileSwipePanels } from "@/components/layout/MobileSwipePanels";
import { LiveKitParticipantGallery } from "@/components/livekit/LiveKitParticipantGallery";
import { LiveKitVideoTile } from "@/components/livekit/LiveKitVideoTile";
import { HostShareCameraPip } from "@/components/livestream/HostShareCameraPip";
import { Logo } from "@/components/Logo";
import { useAppPath } from "@/hooks/useAppBase";
import type { MeetingParticipant } from "@/hooks/useMeetingPresence";
import type { RemoteParticipant } from "livekit-client";
import { cn } from "@/lib/utils";

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
  showConnectionOverlay?: boolean;
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
  clapCount: number;
  isMobile?: boolean;
};

export function LivestreamHostStage({
  meetingTitle,
  viewerCount,
  isLive,
  isConnecting = false,
  showConnectionOverlay = false,
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
  clapCount,
  isMobile = false,
}: Props) {
  const homePath = useAppPath("/");
  const hasHostVideo = !!hostMainTrack?.publication?.track;
  const showCameraOff = isLive && isCameraOff && !isScreenSharing;
  const waitingForVideo =
    isLive && !showConnectionOverlay && !showCameraOff && !hasHostVideo;
  const memberCount = remoteParticipants.filter((p) => p.identity !== hostId).length;
  const mobilePresenting = isMobile && isScreenSharing;
  const inRoomCount = memberCount + (mobilePresenting && hostSelfTile ? 1 : 0);
  const mobilePrimaryKey = isScreenSharing ? "presenting" : "solo";

  const inRoomGallery = (
    <LiveKitParticipantGallery
      remoteParticipants={remoteParticipants}
      participants={participants}
      hostId={hostId}
      hostSelfTile={hostSelfTile}
      memberVideoEnabled={memberVideoEnabled}
      memberMicEnabled={memberMicEnabled}
      layout="sidebar"
      side="right"
      hideHeader={isMobile}
      className={isMobile ? "h-full w-full max-w-none shrink border-0 bg-transparent xl:w-full" : undefined}
    />
  );

  const inRoomPanel = isMobile ? (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <p className="shrink-0 border-b border-gold/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gold-light/80">
        In room
      </p>
      <div className="chat-scroll chat-scroll-dark min-h-0 flex-1 overflow-y-auto p-3">
        {inRoomGallery}
      </div>
    </div>
  ) : (
    inRoomGallery
  );

  const videoStage = (
    <div
      className={cn(
        "livestream-stage-clip relative min-h-0 min-w-0 flex-1 overflow-hidden bg-black",
        showCameraOff && "bg-burgundy-deep",
        mobilePresenting && "flex flex-col items-stretch justify-start",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden",
          mobilePresenting
            ? "mobile-livestream-screen-share mx-auto w-full shrink-0"
            : "h-full min-h-0 w-full",
        )}
      >
        <LiveKitVideoTile
          trackRef={hostMainTrack}
          userId={userId}
          name={userName}
          avatarUrl={avatarUrl}
          cameraOff={showCameraOff}
          waitingForVideo={waitingForVideo}
          videoClassName="h-full w-full object-contain"
          className="h-full w-full"
        />
        {mobilePresenting && hostSelfTile && (
          <HostShareCameraPip
            trackRef={hostSelfTile.trackRef}
            userId={hostSelfTile.participantIdentity}
            name={hostSelfTile.name}
            avatarUrl={hostSelfTile.avatarUrl}
            cameraOff={hostSelfTile.cameraOff}
            muted={!hostSelfTile.micOn}
          />
        )}
      </div>
      {!isScreenSharing && <MuteIndicator visible={isMuted} />}
      {showConnectionOverlay && !error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-burgundy-deep/90">
          <p className="font-serif text-gold-light">
            {isConnecting ? "Connecting to livestream…" : "Reconnecting video…"}
          </p>
        </div>
      )}
      <LivestreamAudienceSignals
        raisedHands={raisedHands}
        thumbsUp={thumbsUp}
        thumbsDown={thumbsDown}
        clapCount={clapCount}
      />
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-gold/30 bg-burgundy px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Logo size="sm" href={homePath} showText={false} inverted />
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
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {isMobile ? (
          <MobileSwipePanels
            primary={videoStage}
            secondary={inRoomPanel}
            secondaryLabel="In room"
            badge={inRoomCount}
            snapPrimaryKey={mobilePrimaryKey}
          />
        ) : (
          <>
            {videoStage}
            {inRoomGallery}
          </>
        )}
      </div>
    </div>
  );
}
