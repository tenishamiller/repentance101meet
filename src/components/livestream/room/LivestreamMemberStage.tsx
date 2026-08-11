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
  handRaised: boolean;
  myReaction: string | null;
  isMobile?: boolean;
  hostId: string;
  remoteParticipants?: RemoteParticipant[];
  participants?: MeetingParticipant[];
};

/** Member stage — always host+self split; other members via swipe (mobile) or gallery. */
export function LivestreamMemberStage({
  meetingTitle,
  isLive,
  isConnecting = false,
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
  handRaised,
  myReaction,
  isMobile = false,
  hostId,
  remoteParticipants = [],
  participants = [],
}: Props) {
  const present = isRemoteScreenSharing;
  const splitHostAndSelf = !present;
  const splitScreenAndSelf = isMobile && present;
  const desktopPresentSidebar = present && !isMobile;
  const selfMuted = isMuted || !memberMicEnabled;
  const selfCameraOff = isCameraOff || !memberVideoEnabled;
  const otherMemberCount = participants.filter(
    (p) => p.user.id !== hostId && p.user.id !== userId,
  ).length;

  const inRoomSecondary = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <p className="shrink-0 border-b border-gold/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gold-light/80">
        In room
      </p>
      <div className="chat-scroll chat-scroll-dark min-h-0 flex-1 overflow-y-auto p-3">
        {present && (
          <div className="mb-3 space-y-2">
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
          </div>
        )}
        {otherMemberCount > 0 ? (
          <LiveKitParticipantGallery
            remoteParticipants={remoteParticipants}
            participants={participants}
            hostId={hostId}
            memberVideoEnabled={memberVideoEnabled}
            memberMicEnabled={memberMicEnabled}
            layout="sidebar"
            hideHeader
            className="h-auto w-full max-w-none shrink border-0 bg-transparent xl:w-full"
          />
        ) : (
          !present && (
            <p className="text-center text-sm text-gold-light/60">
              No other members in the room yet.
            </p>
          )
        )}
      </div>
    </div>
  );

  const videoPrimary = (
    <div
      className={cn(
        "relative min-h-0 w-full flex-1 overflow-hidden bg-black",
        desktopPresentSidebar && "flex flex-row",
        (splitHostAndSelf || splitScreenAndSelf) && "grid min-h-0 grid-cols-2 grid-rows-1",
      )}
    >
      {desktopPresentSidebar ? (
        <>
          <div className="flex min-h-0 w-36 shrink-0 flex-col self-stretch overflow-hidden border-r border-gold/20 bg-burgundy-dark sm:w-44 xl:w-52">
            <p className="shrink-0 border-b border-gold/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gold-light/80">
              In room
            </p>
            <div className="chat-scroll chat-scroll-dark min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
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
            </div>
          </div>
          <div className="relative min-h-0 min-w-0 flex-1 bg-black">
            <LiveKitVideoTile
              trackRef={hostMainTrack}
              userId={hostProfile.userId}
              name={hostProfile.name}
              avatarUrl={hostProfile.avatarUrl}
              waitingForVideo={waitingForHostVideo}
              videoClassName="h-full w-full object-contain"
              lowLatency
            />
          </div>
        </>
      ) : (
        <>
          <div className="relative min-h-0 min-w-0 overflow-hidden border-r border-gold/20 bg-black">
            <LiveKitVideoTile
              trackRef={hostMainTrack}
              userId={hostProfile.userId}
              name={hostProfile.name}
              avatarUrl={hostProfile.avatarUrl}
              cameraOff={present ? false : isRemoteCameraOff}
              waitingForVideo={waitingForHostVideo}
              videoClassName="h-full w-full object-contain"
              lowLatency
            />
            <MuteIndicator visible={isRemoteMuted && !present} />
            {!present && (
              <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-gold/30 bg-burgundy-dark/80 px-2.5 py-1 text-[10px] font-semibold text-gold-light backdrop-blur sm:text-xs">
                {hostProfile.name}
              </p>
            )}
          </div>
          <div className="relative min-h-0 min-w-0 overflow-hidden">
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
              showYouLabel
            />
          </div>
        </>
      )}

      {!isLive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-burgundy-deep">
          <Radio className="h-10 w-10 animate-pulse text-gold" />
          <p className="font-serif text-lg font-semibold text-cream">
            {isConnecting ? "Connecting to live stream..." : "Waiting for host video"}
          </p>
          <p className="text-sm text-gold-light/70">
            {isConnecting ? "Joining the video room" : "The host has not started video yet"}
          </p>
        </div>
      )}

      <LivestreamAudienceSignals
        raisedHands={raisedHands}
        thumbsUp={thumbsUp}
        thumbsDown={thumbsDown}
      />
    </div>
  );

  const statusParts = [
    isLive ? "Live meeting" : "Connecting",
    selfMuted ? "muted" : null,
    selfCameraOff ? "camera off" : null,
    !memberMicEnabled ? "mics off by host" : null,
    !memberVideoEnabled ? "cameras off by host" : null,
  ].filter(Boolean);

  const swipeBadge = otherMemberCount + (present ? 2 : 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-burgundy/30 bg-burgundy px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-serif text-sm font-semibold text-cream sm:text-base">
              {meetingTitle}
            </p>
            <p className="mt-0.5 truncate text-xs text-gold-light/80">{statusParts.join(" · ")}</p>
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
          secondary={inRoomSecondary}
          secondaryLabel="In room"
          badge={swipeBadge}
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
  pip = false,
  compact = false,
  showYouLabel = false,
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
  pip?: boolean;
  compact?: boolean;
  showYouLabel?: boolean;
  panelLayout?: boolean;
}) {
  return (
    <div
      className={
        panelLayout
          ? PANEL_TILE_FRAME_CLASS
          : pip
            ? cn(
                "overflow-hidden border-2 border-gold/50 bg-burgundy-deep shadow-2xl",
                "h-32 w-36 rounded-xl sm:h-32 sm:w-48",
                "md:h-36 md:w-36 md:rounded-full",
              )
            : "relative h-full min-h-0 w-full bg-burgundy-deep"
      }
    >
      <LiveKitVideoTile
        trackRef={trackRef}
        userId={userId}
        name={userName}
        avatarUrl={avatarUrl}
        cameraOff={cameraOff}
        waitingForVideo={waitingForVideo}
        compact={pip || compact}
        panelLayout={panelLayout}
        pipLayout={pip}
      />
      <ParticipantSignalBadges handRaised={handRaised} reaction={myReaction} />
      {!panelLayout && (
        <>
          <MuteIndicator visible={selfMuted} compact={pip || compact} />
          {(pip || showYouLabel) && (
            <p className="absolute bottom-1 left-2 z-10 text-[10px] font-semibold text-gold-light/80">
              You
            </p>
          )}
        </>
      )}
    </div>
  );
}
