"use client";

import { Radio } from "lucide-react";
import { CameraOffOverlay } from "@/components/livestream/CameraOffOverlay";
import {
  LivestreamAudienceSignals,
  ParticipantSignalBadges,
} from "@/components/livestream/LivestreamAudienceSignals";
import { MuteIndicator } from "@/components/livestream/MuteIndicator";

type HostProfile = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

type Props = {
  meetingTitle: string;
  isLive: boolean;
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
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteHostCameraVideoRef: React.RefObject<HTMLVideoElement | null>;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  raisedHands: { userId: string; name: string }[];
  thumbsUp: number;
  thumbsDown: number;
  handRaised: boolean;
  myReaction: string | null;
};

/** Member stage — host is primary; member self-view is a small PiP unless host is presenting. */
export function LivestreamMemberStage({
  meetingTitle,
  isLive,
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
  remoteVideoRef,
  remoteHostCameraVideoRef,
  localVideoRef,
  raisedHands,
  thumbsUp,
  thumbsDown,
  handRaised,
  myReaction,
}: Props) {
  const present = isRemoteScreenSharing;
  const selfMuted = isMuted || !memberMicEnabled;

  const statusParts = [
    isLive ? "Live meeting" : "Connecting",
    selfMuted ? "muted" : null,
    isCameraOff ? "camera off" : null,
    !memberMicEnabled ? "mics off by host" : null,
    !memberVideoEnabled ? "cameras off by host" : null,
  ].filter(Boolean);

  return (
    <>
      <div className="shrink-0 border-b border-gold/30 bg-burgundy px-3 py-2 sm:px-4">
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
          present ? "flex-row" : ""
        }`}
      >
        {/* Host main — screen when presenting, otherwise full-stage host camera */}
        <div className={`relative min-h-0 min-w-0 bg-black ${present ? "flex-1" : "absolute inset-0"}`}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`h-full w-full object-contain ${!present && isRemoteCameraOff ? "hidden" : ""}`}
          />
          {!present && isRemoteCameraOff && (
            <CameraOffOverlay
              userId={hostProfile.userId}
              name={hostProfile.name}
              avatarUrl={hostProfile.avatarUrl}
            />
          )}
          <MuteIndicator visible={isRemoteMuted} />
          {!present && (
            <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-gold/30 bg-burgundy-dark/80 px-2.5 py-1 text-[10px] font-semibold text-gold-light backdrop-blur sm:text-xs">
              {hostProfile.name}
            </p>
          )}
        </div>

        {present ? (
          /* Screen share: host camera + member self in right rail */
          <div className="flex w-36 shrink-0 flex-col border-l border-gold/20 bg-burgundy-dark sm:w-44 xl:w-52">
            <div className="relative aspect-video shrink-0 border-b border-gold/10">
              <video
                ref={remoteHostCameraVideoRef}
                autoPlay
                playsInline
                className={`h-full w-full object-cover ${isRemoteCameraOff ? "hidden" : ""}`}
              />
              {isRemoteCameraOff && (
                <CameraOffOverlay
                  userId={hostProfile.userId}
                  name={hostProfile.name}
                  avatarUrl={hostProfile.avatarUrl}
                  compact
                />
              )}
              <MuteIndicator visible={isRemoteMuted} compact />
              <p className="absolute bottom-1 left-2 text-[10px] font-semibold text-gold-light/80">
                Host
              </p>
            </div>

            <div className="relative min-h-0 flex-1">
              <MemberSelfTile
                localVideoRef={localVideoRef}
                userId={userId}
                userName={userName}
                avatarUrl={avatarUrl}
                isCameraOff={isCameraOff}
                selfMuted={selfMuted}
                handRaised={handRaised}
                myReaction={myReaction}
                compact
                showYouLabel
              />
            </div>
          </div>
        ) : (
          /* Default: small PiP for member self */
          <div className="pointer-events-none absolute bottom-3 right-3 z-10 sm:bottom-4 sm:right-4">
            <MemberSelfTile
              localVideoRef={localVideoRef}
              userId={userId}
              userName={userName}
              avatarUrl={avatarUrl}
              isCameraOff={isCameraOff}
              selfMuted={selfMuted}
              handRaised={handRaised}
              myReaction={myReaction}
              pip
            />
          </div>
        )}

        {!isLive && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-burgundy-deep">
            <Radio className="h-10 w-10 animate-pulse text-gold" />
            <p className="font-serif text-lg font-semibold text-cream">Connecting to live stream...</p>
            <p className="text-sm text-gold-light/70">Waiting for host video</p>
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
  localVideoRef,
  userId,
  userName,
  avatarUrl,
  isCameraOff,
  selfMuted,
  handRaised,
  myReaction,
  pip = false,
  compact = false,
  showYouLabel = false,
}: {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  isCameraOff: boolean;
  selfMuted: boolean;
  handRaised: boolean;
  myReaction: string | null;
  pip?: boolean;
  compact?: boolean;
  showYouLabel?: boolean;
}) {
  return (
    <div
      className={
        pip
          ? "h-24 w-36 overflow-hidden rounded-xl border-2 border-gold/50 bg-black shadow-2xl sm:h-32 sm:w-48 md:h-36 md:w-52"
          : "relative h-full min-h-0 w-full"
      }
    >
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className={`h-full w-full object-cover ${isCameraOff ? "hidden" : ""}`}
      />
      {isCameraOff && (
        <CameraOffOverlay
          userId={userId}
          name={userName}
          avatarUrl={avatarUrl}
          compact={pip || compact}
        />
      )}
      <ParticipantSignalBadges handRaised={handRaised} reaction={myReaction} />
      <MuteIndicator visible={selfMuted} compact={pip || compact} />
      {(pip || showYouLabel) && (
        <p className="absolute bottom-1 left-2 text-[10px] font-semibold text-gold-light/80">You</p>
      )}
    </div>
  );
}
