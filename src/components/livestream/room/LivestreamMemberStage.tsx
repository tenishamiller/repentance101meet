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

/** Member stage — video elements stay mounted so WebRTC bindings are not lost. */
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

  return (
    <div
      className={`relative flex min-h-0 flex-1 overflow-hidden bg-black ${
        present ? "flex-row" : "flex-col sm:grid sm:grid-cols-2"
      }`}
    >
      {/* Host main — screen when presenting, otherwise host camera */}
      <div
        className={`relative min-h-0 min-w-0 bg-black ${
          present ? "flex-1" : "border-b border-gold/20 sm:border-b-0 sm:border-r"
        }`}
      >
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
      </div>

      {/* Right rail when presenting, or member tile in split mode */}
      <div
        className={
          present
            ? "flex w-36 shrink-0 flex-col border-l border-gold/20 bg-burgundy-dark sm:w-44 xl:w-52"
            : "relative min-h-0"
        }
      >
        {/* Host camera PiP — only visible during screen share */}
        <div
          className={
            present
              ? "relative aspect-video shrink-0 border-b border-gold/10"
              : "hidden"
          }
        >
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

        {/* Member self */}
        <div className={present ? "relative min-h-0 flex-1" : "relative h-full min-h-[12rem]"}>
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
              compact={present}
            />
          )}
          <ParticipantSignalBadges handRaised={handRaised} reaction={myReaction} />
          <MuteIndicator visible={selfMuted} compact={present} />
          {present && (
            <p className="absolute bottom-1 left-2 text-[10px] font-semibold text-gold-light/80">
              You
            </p>
          )}
        </div>
      </div>

      {!isLive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-burgundy-deep">
          <Radio className="h-10 w-10 animate-pulse text-gold" />
          <p className="font-serif text-lg font-semibold text-cream">Connecting to live stream...</p>
          <p className="text-sm text-gold-light/70">Waiting for host video</p>
        </div>
      )}

      {isLive && (
        <div className="pointer-events-none absolute left-4 top-4 z-10">
          <div className="badge-live">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
            </span>
            LIVE
          </div>
        </div>
      )}

      <LivestreamAudienceSignals
        raisedHands={raisedHands}
        thumbsUp={thumbsUp}
        thumbsDown={thumbsDown}
      />

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-xl border border-gold/30 bg-burgundy-dark/80 px-4 py-2 backdrop-blur">
        <p className="font-serif text-sm font-semibold text-cream">{meetingTitle}</p>
        <p className="text-xs text-gold-light/80">
          Live meeting
          {selfMuted ? " · muted" : ""}
          {isCameraOff ? " · camera off" : ""}
          {!memberMicEnabled ? " · mics off by host" : ""}
          {!memberVideoEnabled ? " · cameras off by host" : ""}
        </p>
      </div>
    </div>
  );
}
