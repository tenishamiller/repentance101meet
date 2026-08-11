"use client";

import { Radio } from "lucide-react";
import type { TrackReference } from "@livekit/components-core";
import {
  LivestreamAudienceSignals,
  ParticipantSignalBadges,
} from "@/components/livestream/LivestreamAudienceSignals";
import { LiveKitVideoTile } from "@/components/livekit/LiveKitVideoTile";
import { MuteIndicator } from "@/components/livestream/MuteIndicator";
import { ParticipantPanelNameRow } from "@/components/livestream/ParticipantPanelNameRow";
import type { MemberVideoLayout } from "@/lib/video-layout";

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
  memberVideoLayout: MemberVideoLayout;
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
};

/** Member stage — split or corner self-view; host stays primary unless presenting. */
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
  memberVideoLayout,
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
}: Props) {
  const present = isRemoteScreenSharing;
  const splitView = !present && memberVideoLayout === "side-by-side";
  const selfMuted = isMuted || !memberMicEnabled;
  const selfCameraOff = isCameraOff || !memberVideoEnabled;

  const statusParts = [
    isLive ? "Live meeting" : "Connecting",
    selfMuted ? "muted" : null,
    selfCameraOff ? "camera off" : null,
    !memberMicEnabled ? "mics off by host" : null,
    !memberVideoEnabled ? "cameras off by host" : null,
  ].filter(Boolean);

  return (
    <>
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

      <div
        className={`relative flex min-h-0 flex-1 overflow-hidden bg-black ${
          present
            ? "flex-row"
            : splitView
              ? "grid min-h-0 grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1"
              : ""
        }`}
      >
        {present ? (
          <>
            <div className="flex w-36 shrink-0 flex-col border-r border-gold/20 bg-burgundy-dark sm:w-44 xl:w-52">
              <p className="shrink-0 border-b border-gold/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gold-light/80">
                In room
              </p>
              <div className="chat-scroll chat-scroll-dark min-h-0 flex-1 space-y-2 p-2">
                <div className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-gold/30 bg-burgundy-dark">
                  <div className="relative aspect-video bg-black">
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

                <div className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-gold/30 bg-burgundy-dark">
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
        <div
          className={`relative min-h-0 min-w-0 overflow-hidden ${
              splitView
                ? "border-b border-gold/20 bg-black sm:border-b-0 sm:border-r"
                : "absolute inset-0 bg-black"
          }`}
        >
          <LiveKitVideoTile
            trackRef={hostMainTrack}
            userId={hostProfile.userId}
            name={hostProfile.name}
            avatarUrl={hostProfile.avatarUrl}
            cameraOff={isRemoteCameraOff}
            waitingForVideo={waitingForHostVideo}
            videoClassName="h-full w-full object-contain"
            lowLatency
          />
          <MuteIndicator visible={isRemoteMuted} />
          <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-gold/30 bg-burgundy-dark/80 px-2.5 py-1 text-[10px] font-semibold text-gold-light backdrop-blur sm:text-xs">
            {hostProfile.name}
          </p>
        </div>

        {splitView ? (
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
        ) : (
          <div className="pointer-events-none absolute bottom-3 right-3 z-10 sm:bottom-4 sm:right-4">
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
              pip
            />
          </div>
        )}
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
    </>
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
          ? "relative aspect-video bg-black"
          : pip
            ? "h-24 w-36 overflow-hidden rounded-xl border-2 border-gold/50 bg-burgundy-deep shadow-2xl sm:h-32 sm:w-48 md:h-36 md:w-52"
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
