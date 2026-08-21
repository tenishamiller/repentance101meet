"use client";

import { Radio } from "lucide-react";
import type { TrackReference } from "@livekit/components-core";
import {
  LivestreamAudienceSignals,
  ParticipantSignalBadges,
} from "@/components/livestream/LivestreamAudienceSignals";
import { MobileSwipePanels } from "@/components/layout/MobileSwipePanels";
import { LiveKitParticipantGallery } from "@/components/livekit/LiveKitParticipantGallery";
import { LiveKitVideoTile } from "@/components/livekit/LiveKitVideoTile";
import { MuteIndicator } from "@/components/livestream/MuteIndicator";
import { ParticipantPanelNameRow } from "@/components/livestream/ParticipantPanelNameRow";
import type { MeetingParticipant } from "@/hooks/useMeetingPresence";
import type { RemoteParticipant } from "livekit-client";
import { Logo } from "@/components/Logo";
import { useAppPath } from "@/hooks/useAppBase";
import { PANEL_TILE_CARD_CLASS, PANEL_TILE_FRAME_CLASS } from "@/lib/panel-tile";
import { cn } from "@/lib/utils";

type HostProfile = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

type Props = {
  meetingTitle: string;
  isLive: boolean;
  isConnecting?: boolean;
  showConnectionOverlay?: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isRemoteCameraOff: boolean;
  isRemoteMuted: boolean;
  isRemoteScreenSharing: boolean;
  memberVideoEnabled: boolean;
  memberMicEnabled: boolean;
  hostProfile: HostProfile;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  hostMainTrack?: TrackReference;
  hostCameraPipTrack?: TrackReference;
  localCameraTrack?: TrackReference;
  waitingForHostVideo?: boolean;
  waitingForSelfVideo?: boolean;
  raisedHands: { userId: string; name: string }[];
  thumbsUp: number;
  thumbsDown: number;
  clapCount: number;
  handRaised: boolean;
  myReaction: string | null;
  isMobile?: boolean;
  hostId: string;
  remoteParticipants?: RemoteParticipant[];
  participants?: MeetingParticipant[];
};

/** Member stage — mobile swipe in-room panel; desktop always keeps everyone on the right. */
export function LivestreamMemberStage({
  meetingTitle,
  isLive,
  isConnecting = false,
  showConnectionOverlay = false,
  isMuted,
  isCameraOff,
  isRemoteCameraOff,
  isRemoteMuted,
  isRemoteScreenSharing,
  memberVideoEnabled,
  memberMicEnabled,
  hostProfile,
  userId,
  userName,
  avatarUrl,
  hostMainTrack,
  hostCameraPipTrack,
  localCameraTrack,
  waitingForHostVideo = false,
  waitingForSelfVideo = false,
  raisedHands,
  thumbsUp,
  thumbsDown,
  clapCount,
  handRaised,
  myReaction,
  isMobile = false,
  hostId,
  remoteParticipants = [],
  participants = [],
}: Props) {
  const homePath = useAppPath("/");
  const present = isRemoteScreenSharing;
  const mobilePresentShare = isMobile && present;
  const mobilePrimaryKey = present ? "presenting" : "solo";
  const selfMuted = isMuted || !memberMicEnabled;
  const selfCameraOff = isCameraOff;
  const otherMemberCount = participants.filter(
    (p) => p.user.id !== hostId && p.user.id !== userId,
  ).length;

  const selfTileCard = (
    <div className={PANEL_TILE_CARD_CLASS}>
      <MemberSelfTile
        trackRef={localCameraTrack}
        userId={userId}
        userName={userName}
        avatarUrl={avatarUrl}
        cameraOff={selfCameraOff}
        waitingForVideo={waitingForSelfVideo}
        selfMuted={selfMuted}
        handRaised={handRaised}
        myReaction={myReaction}
        compact
        panelLayout
      />
      <ParticipantPanelNameRow name="You" muted={selfMuted} />
    </div>
  );

  const hostPipCard = present ? (
    <div className={PANEL_TILE_CARD_CLASS}>
      <div className={PANEL_TILE_FRAME_CLASS}>
        <LiveKitVideoTile
          trackRef={hostCameraPipTrack}
          userId={hostProfile.userId}
          name={hostProfile.name}
          avatarUrl={hostProfile.avatarUrl}
          cameraOff={isRemoteCameraOff}
          waitingForVideo={waitingForHostVideo}
          compact
          panelLayout
        />
      </div>
      <ParticipantPanelNameRow name={hostProfile.name} muted={isRemoteMuted} />
    </div>
  ) : null;

  const otherMembersGallery = (
    <LiveKitParticipantGallery
      remoteParticipants={remoteParticipants}
      participants={participants}
      hostId={hostId}
      memberVideoEnabled={memberVideoEnabled}
      memberMicEnabled={memberMicEnabled}
      layout="sidebar"
      side="right"
      hideHeader
      className="h-auto w-full max-w-none shrink border-0 bg-transparent xl:w-full"
    />
  );

  const inRoomPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <p className="shrink-0 border-b border-gold/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gold-light/80 sm:px-4 sm:py-3">
        In room
      </p>
      <div className="chat-scroll chat-scroll-dark min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain p-2 sm:p-3">
        {hostPipCard}
        {selfTileCard}
        {otherMembersGallery}
      </div>
    </div>
  );

  const hostMainVideo = (
    <div
      className={cn(
        "livestream-stage-clip relative min-h-0 min-w-0 flex-1 overflow-hidden bg-black",
        mobilePresentShare && "mobile-livestream-screen-share mx-auto w-full shrink-0",
      )}
    >
      <LiveKitVideoTile
        trackRef={hostMainTrack}
        userId={hostProfile.userId}
        name={hostProfile.name}
        avatarUrl={hostProfile.avatarUrl}
        cameraOff={present ? false : isRemoteCameraOff}
        waitingForVideo={waitingForHostVideo}
        videoClassName="h-full w-full object-contain"
        lowLatency
        className={mobilePresentShare ? "absolute inset-0 h-full w-full" : "h-full w-full"}
      />
      {!present && <MuteIndicator visible={isRemoteMuted} />}
      {!present && (
        <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-gold/30 bg-burgundy-dark/80 px-2.5 py-1 text-[10px] font-semibold text-gold-light backdrop-blur sm:text-xs">
          {hostProfile.name}
        </p>
      )}
      {present && isLive && (
        <p className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-gold/40 bg-burgundy-dark/85 px-2.5 py-1 text-[10px] font-semibold text-gold-light backdrop-blur sm:text-xs">
          Host is presenting
        </p>
      )}
    </div>
  );

  const videoPrimary = (
    <div
      className={cn(
        "relative flex min-h-0 w-full flex-1 overflow-hidden bg-black",
        !isMobile && "min-h-0 flex-row",
        mobilePresentShare && "flex-col items-stretch justify-start",
      )}
    >
      {hostMainVideo}

      {!isMobile && (
        <div className="flex min-h-0 w-36 shrink-0 flex-col self-stretch overflow-hidden border-l border-gold/20 bg-burgundy-dark sm:w-44 xl:w-52">
          {inRoomPanel}
        </div>
      )}

      {showConnectionOverlay && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-burgundy-deep/95">
          <Radio className="h-10 w-10 animate-pulse text-gold" />
          <p className="font-serif text-lg font-semibold text-cream">
            {isConnecting ? "Connecting to livestream…" : "Reconnecting to livestream…"}
          </p>
          <p className="text-sm text-gold-light/70">Stay on this page — video will resume automatically</p>
        </div>
      )}

      {!showConnectionOverlay && isLive && waitingForHostVideo && !present && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-burgundy-deep/40">
          <p className="rounded-xl border border-gold/30 bg-burgundy-dark/90 px-4 py-2 font-serif text-sm text-gold-light">
            Waiting for host video…
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

  const statusParts = [
    showConnectionOverlay ? "Connecting" : isLive ? "Live meeting" : "Offline",
    selfMuted ? "muted" : null,
    selfCameraOff ? "camera off" : null,
    !memberMicEnabled ? "mics off by host" : null,
  ].filter(Boolean);

  const swipeBadge = otherMemberCount + (present ? 2 : 1);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-burgundy/30 bg-burgundy px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Logo size="sm" href={homePath} showText={false} inverted />
            <div className="min-w-0">
              <p className="truncate font-serif text-sm font-semibold text-cream sm:text-base">
                {meetingTitle}
              </p>
              <p className="mt-0.5 truncate text-xs text-gold-light/80">{statusParts.join(" · ")}</p>
            </div>
          </div>
          {isLive && (
            <div className="badge-live shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
              </span>
              LIVE
            </div>
          )}
        </div>
      </div>

      {isMobile ? (
        <MobileSwipePanels
          primary={videoPrimary}
          secondary={inRoomPanel}
          secondaryLabel="In room"
          badge={swipeBadge}
          snapPrimaryKey={mobilePrimaryKey}
        />
      ) : (
        videoPrimary
      )}
    </div>
  );
}

function MemberSelfTile({
  trackRef,
  userId,
  userName,
  avatarUrl,
  cameraOff,
  waitingForVideo = false,
  selfMuted,
  handRaised,
  myReaction,
  compact = false,
  panelLayout = false,
}: {
  trackRef?: TrackReference;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  cameraOff: boolean;
  waitingForVideo?: boolean;
  selfMuted: boolean;
  handRaised: boolean;
  myReaction: string | null;
  compact?: boolean;
  panelLayout?: boolean;
}) {
  return (
    <div className={panelLayout ? PANEL_TILE_FRAME_CLASS : "relative h-full min-h-0 w-full bg-burgundy-deep"}>
      <LiveKitVideoTile
        trackRef={trackRef}
        userId={userId}
        name={userName}
        avatarUrl={avatarUrl}
        cameraOff={cameraOff}
        waitingForVideo={waitingForVideo}
        compact={compact}
        panelLayout={panelLayout}
      />
      <ParticipantSignalBadges handRaised={handRaised} reaction={myReaction} />
      {!panelLayout && <MuteIndicator visible={selfMuted} compact={compact} />}
    </div>
  );
}
