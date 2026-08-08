"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Circle,
  Download,
  Hand,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  Radio,
  ThumbsDown,
  ThumbsUp,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { ShowMoreList } from "@/components/ShowMoreList";
import { useLivestream } from "@/hooks/useLivestream";
import { MeetingChat } from "@/components/livestream/MeetingChat";
import { MemberJoinLink } from "@/components/livestream/MemberJoinLink";
import { MeetingEndedScreen } from "@/components/livestream/MeetingEndedScreen";
import { ParticipantGallery } from "@/components/livestream/ParticipantGallery";
import { CameraDeviceSelect } from "@/components/livestream/CameraDeviceSelect";
import { RecordingTimer } from "@/components/livestream/RecordingTimer";
import { VideoLayoutSelect } from "@/components/livestream/VideoLayoutSelect";
import { BlockedUsersPanel } from "@/components/livestream/BlockedUsersPanel";
import {
  getHostGalleryLayout,
  getMemberVideoLayout,
  setHostGalleryLayout,
  setMemberVideoLayout,
  type HostGalleryLayout,
  type MemberVideoLayout,
} from "@/lib/video-layout";

type Props = {
  meetingToken: string;
  meetingTitle: string;
  userId: string;
  userName: string;
  isHost: boolean;
  hostId: string;
};

export function LivestreamRoom({
  meetingToken,
  meetingTitle,
  userId,
  userName,
  isHost,
  hostId,
}: Props) {
  const router = useRouter();
  const [hostGalleryLayout, setHostGalleryLayoutState] = useState<HostGalleryLayout>("sidebar");
  const [memberVideoLayout, setMemberVideoLayoutState] = useState<MemberVideoLayout>("pip");

  useEffect(() => {
    setHostGalleryLayoutState(getHostGalleryLayout());
    setMemberVideoLayoutState(getMemberVideoLayout());
  }, []);

  function updateHostGalleryLayout(layout: HostGalleryLayout) {
    setHostGalleryLayoutState(layout);
    setHostGalleryLayout(layout);
  }

  function updateMemberVideoLayout(layout: MemberVideoLayout) {
    setMemberVideoLayoutState(layout);
    setMemberVideoLayout(layout);
  }

  const {
    localVideoRef,
    remoteVideoRef,
    isLive,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isRecording,
    isSavingRecording,
    recordingElapsedSeconds,
    videoInputDevices,
    selectedVideoDeviceId,
    switchVideoDevice,
    participants,
    galleryMembers,
    viewerCount,
    error,
    handRaised,
    thumbsUp,
    thumbsDown,
    myReaction,
    memberVideoEnabled,
    memberMicEnabled,
    toggleMute,
    toggleCamera,
    toggleMemberVideo,
    toggleMemberMic,
    toggleScreenShare,
    beginRecording,
    endBroadcast,
    toggleHand,
    sendReaction,
    kickViewer,
    meetingEnded,
    recordingSaveMessage,
  } = useLivestream({
    meetingToken,
    meetingTitle,
    userId,
    userName,
    isHost,
    hostId,
    onKicked: () => router.push("/livestream?removed=1"),
  });

  const raisedHands = useMemo(
    () => participants.filter((p) => p.handRaised && p.user.id !== hostId),
    [participants, hostId],
  );
  const viewers = useMemo(
    () => participants.filter((p) => p.user.id !== hostId),
    [participants, hostId],
  );

  if (meetingEnded) {
    return (
      <MeetingEndedScreen
        meetingTitle={meetingTitle}
        variant={isHost ? "host" : "viewer"}
        recordingSaveStatus={recordingSaveMessage}
        onContinue={() => router.push(isHost ? "/admin?recording=1" : "/livestream")}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] min-h-0 flex-col overflow-hidden bg-burgundy-deep lg:flex-row">
      {/* Main stage */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {isHost ? (
          <>
            {/* Host header — title & status only */}
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
                    {isRecording && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 px-2 py-0.5 font-bold text-gold">
                        <Circle className="h-2 w-2 fill-gold text-gold" />
                        REC
                        <RecordingTimer elapsedSeconds={recordingElapsedSeconds} />
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

            {/* Host video + member gallery */}
            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-black">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-contain"
                />
                {!isLive && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-burgundy-deep/90">
                    <p className="font-serif text-gold-light">Starting camera...</p>
                  </div>
                )}
              </div>

              {hostGalleryLayout === "sidebar" && (
                <ParticipantGallery
                  members={galleryMembers}
                  memberVideoEnabled={memberVideoEnabled}
                  memberMicEnabled={memberMicEnabled}
                  layout="sidebar"
                />
              )}
            </div>

            {hostGalleryLayout === "bottom" && (
              <ParticipantGallery
                members={galleryMembers}
                memberVideoEnabled={memberVideoEnabled}
                memberMicEnabled={memberMicEnabled}
                layout="bottom"
              />
            )}

            {/* Host controls — always visible dock with Record, Share, etc. */}
            <div className="z-20 shrink-0 border-t border-gold/30 bg-burgundy-dark px-2 py-2.5 sm:px-4 sm:py-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={beginRecording}
                    disabled={!isLive}
                    className="inline-flex items-center gap-2 rounded-lg border border-gold bg-gold px-3 py-2 text-xs font-bold text-burgundy-deep transition hover:bg-gold-light disabled:opacity-50 sm:text-sm"
                  >
                    <Circle className="h-4 w-4 fill-burgundy text-burgundy" />
                    Record
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSavingRecording}
                    onClick={async () => {
                      await endBroadcast();
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-gold bg-cream/10 px-3 py-2 text-xs font-bold text-gold-light transition hover:bg-gold/20 disabled:opacity-60 sm:text-sm"
                  >
                    <Circle className="h-3 w-3 fill-gold text-gold" />
                    <RecordingTimer elapsedSeconds={recordingElapsedSeconds} />
                    <span className="text-gold-light/50">·</span>
                    <Download className="h-4 w-4" />
                    {isSavingRecording ? "Saving..." : "End & Download"}
                  </button>
                )}
                <CameraDeviceSelect
                  devices={videoInputDevices}
                  selectedDeviceId={selectedVideoDeviceId}
                  onChange={(deviceId) => void switchVideoDevice(deviceId)}
                  disabled={!isLive}
                />
                <VideoLayoutSelect
                  mode="host"
                  value={hostGalleryLayout}
                  onChange={updateHostGalleryLayout}
                />
                <button
                  type="button"
                  onClick={() => void toggleScreenShare()}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition sm:text-sm ${
                    isScreenSharing
                      ? "border-gold bg-gold text-burgundy-deep"
                      : "border-gold/50 bg-burgundy text-gold-light hover:border-gold"
                  }`}
                >
                  {isScreenSharing ? (
                    <>
                      <MonitorOff className="h-4 w-4" />
                      Stop Share
                    </>
                  ) : (
                    <>
                      <MonitorUp className="h-4 w-4" />
                      Share Screen
                    </>
                  )}
                </button>
                <HostPolicyToggle
                  active={memberVideoEnabled}
                  onClick={toggleMemberVideo}
                  enabledLabel="Member Video On"
                  disabledLabel="Member Video Off"
                  enabledIcon={Video}
                  disabledIcon={VideoOff}
                />
                <HostPolicyToggle
                  active={memberMicEnabled}
                  onClick={toggleMemberMic}
                  enabledLabel="Member Mics On"
                  disabledLabel="Member Mics Off"
                  enabledIcon={Mic}
                  disabledIcon={MicOff}
                />
                <ControlButton
                  onClick={toggleMute}
                  active={!isMuted}
                  label={isMuted ? "Unmute" : "Mute"}
                  icon={isMuted ? MicOff : Mic}
                />
                <ControlButton
                  onClick={toggleCamera}
                  active={!isCameraOff}
                  label={isCameraOff ? "Camera On" : "Camera Off"}
                  icon={isCameraOff ? VideoOff : Video}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              className={`relative min-h-0 flex-1 overflow-hidden bg-black ${
                memberVideoLayout === "side-by-side" ? "grid grid-cols-1 sm:grid-cols-2" : ""
              }`}
            >
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`h-full w-full object-contain ${
                  memberVideoLayout === "side-by-side" ? "border-r border-gold/20" : ""
                }`}
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={
                  memberVideoLayout === "side-by-side"
                    ? `h-full w-full object-cover ${isCameraOff ? "opacity-40" : ""}`
                    : `absolute bottom-4 right-4 z-10 h-24 w-32 rounded-xl border-2 border-gold/50 object-cover shadow-2xl sm:h-28 sm:w-40 ${
                        isCameraOff ? "opacity-40" : ""
                      }`
                }
              />
              {!isLive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-burgundy-deep">
                  <Radio className="h-10 w-10 animate-pulse text-gold" />
                  <p className="font-serif text-lg font-semibold text-cream">
                    Connecting to live stream...
                  </p>
                  <p className="text-sm text-gold-light/70">Waiting for host video</p>
                </div>
              )}

              <div className="pointer-events-none absolute left-4 top-4 z-10">
                {isLive && (
                  <div className="badge-live">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
                    </span>
                    LIVE
                  </div>
                )}
              </div>

              <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-xl border border-gold/30 bg-burgundy-dark/80 px-4 py-2 backdrop-blur">
                <p className="font-serif text-sm font-semibold text-cream">{meetingTitle}</p>
                <p className="text-xs text-gold-light/80">
                  Live meeting
                  {isMuted ? " · muted" : ""}
                  {isCameraOff ? " · camera off" : ""}
                  {!memberMicEnabled ? " · mics off by host" : ""}
                  {!memberVideoEnabled ? " · cameras off by host" : ""}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-gold/20 bg-burgundy-dark px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
              <CameraDeviceSelect
                devices={videoInputDevices}
                selectedDeviceId={selectedVideoDeviceId}
                onChange={(deviceId) => void switchVideoDevice(deviceId)}
                disabled={!isLive || !memberVideoEnabled}
              />
              <VideoLayoutSelect
                mode="member"
                value={memberVideoLayout}
                onChange={updateMemberVideoLayout}
              />
              <ControlButton
                onClick={toggleMute}
                active={!isMuted}
                label={isMuted ? "Unmute" : "Mute"}
                icon={isMuted ? MicOff : Mic}
              />
              <ControlButton
                onClick={toggleCamera}
                active={!isCameraOff}
                label={isCameraOff ? "Camera On" : "Camera Off"}
                icon={isCameraOff ? VideoOff : Video}
              />
              <button
                type="button"
                onClick={() => void sendReaction("react-up")}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  myReaction === "UP"
                    ? "bg-gold text-burgundy-deep"
                    : "border border-gold/40 bg-burgundy text-gold-light hover:bg-burgundy-dark"
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
                <span className="hidden sm:inline">Like</span>
              </button>
              <button
                type="button"
                onClick={() => void sendReaction("react-down")}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  myReaction === "DOWN"
                    ? "border border-gold/50 bg-burgundy-dark text-cream"
                    : "border border-gold/40 bg-burgundy text-gold-light hover:bg-burgundy-dark"
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
                <span className="hidden sm:inline">Dislike</span>
              </button>
              <button
                type="button"
                onClick={toggleHand}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${
                  handRaised
                    ? "bg-gold text-burgundy-deep"
                    : "border border-gold/40 bg-burgundy text-gold-light hover:bg-burgundy-dark"
                }`}
              >
                <Hand className="h-4 w-4" />
                <span className="hidden sm:inline">{handRaised ? "Hand Raised" : "Raise Hand"}</span>
              </button>
              <button
                type="button"
                onClick={() => router.push("/livestream")}
                className="rounded-full border border-gold/40 px-4 py-2.5 text-sm font-semibold text-gold-light hover:bg-burgundy"
              >
                Leave
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="shrink-0 border-t border-gold/30 bg-burgundy px-4 py-2 text-sm text-gold-light">
            {error}
          </div>
        )}
      </div>

      {/* Sidebar — wider chat panel */}
      <div className="flex min-h-0 w-full flex-col border-t border-gold/20 max-lg:h-[38vh] lg:h-auto lg:w-[28rem] lg:shrink-0 lg:border-l lg:border-t-0 xl:w-[32rem]">
        {isHost && (
          <div className="shrink-0 border-b border-gold/20 bg-burgundy p-3 sm:p-4">
            <MemberJoinLink meetingToken={meetingToken} variant="room" />
            {(thumbsUp > 0 || thumbsDown > 0) && (
              <div className="mb-2 flex gap-2 text-sm">
                {thumbsUp > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-1 font-semibold text-gold-light">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {thumbsUp}
                  </span>
                )}
                {thumbsDown > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-burgundy-dark px-2.5 py-1 font-semibold text-cream/80">
                    <ThumbsDown className="h-3.5 w-3.5" />
                    {thumbsDown}
                  </span>
                )}
              </div>
            )}
            <h3 className="mb-2 flex items-center gap-2 font-serif text-sm font-semibold text-gold-light">
              <Users className="h-4 w-4 text-gold" />
              Viewers ({viewerCount})
            </h3>
            <ShowMoreList
              items={viewers}
              initialCount={8}
              step={8}
              maxHeightClass="max-h-48"
              listClassName="space-y-1.5"
              moreLabel="viewers"
              getKey={(p) => p.user.id}
              emptyMessage={
                <p className="text-sm text-gold-light/60">Waiting for viewers to join...</p>
              }
              renderItem={(p) => (
                <div className="flex items-center justify-between rounded-lg border border-gold/10 bg-burgundy-dark px-2.5 py-1.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <UserAvatar
                      userId={p.user.id}
                      name={p.user.name}
                      avatarUrl={p.user.avatarUrl}
                      size="md"
                    />
                    <span className="truncate text-sm text-cream">{p.user.name}</span>
                    {p.handRaised && <span title="Hand raised">✋</span>}
                    {p.reaction === "UP" && (
                      <ThumbsUp className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Thumbs up" />
                    )}
                    {p.reaction === "DOWN" && (
                      <ThumbsDown
                        className="h-3.5 w-3.5 shrink-0 text-cream/70"
                        aria-label="Thumbs down"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void kickViewer(p.user.id)}
                    className="ml-2 shrink-0 text-xs text-gold-light/70 hover:text-gold"
                  >
                    Remove
                  </button>
                </div>
              )}
            />

            {raisedHands.length > 0 && (
              <div className="mt-2 rounded-lg border border-gold/40 bg-gold/10 p-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gold">Raised Hands</p>
                <ul className="mt-1 space-y-0.5">
                  {raisedHands.map((p) => (
                    <li key={p.user.id} className="text-sm text-cream">
                      ✋ {p.user.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <BlockedUsersPanel meetingToken={meetingToken} />
          </div>
        )}

        <div className="min-h-0 flex-1">
          <MeetingChat meetingToken={meetingToken} userId={userId} isAdmin={isHost} />
        </div>
      </div>
    </div>
  );
}

function HostPolicyToggle({
  active,
  onClick,
  enabledLabel,
  disabledLabel,
  enabledIcon: EnabledIcon,
  disabledIcon: DisabledIcon,
}: {
  active: boolean;
  onClick: () => void;
  enabledLabel: string;
  disabledLabel: string;
  enabledIcon: React.ComponentType<{ className?: string }>;
  disabledIcon: React.ComponentType<{ className?: string }>;
}) {
  const label = active ? enabledLabel : disabledLabel;
  const Icon = active ? EnabledIcon : DisabledIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition sm:text-sm ${
        active
          ? "border-gold/50 bg-burgundy-dark text-gold-light hover:border-gold"
          : "border-gold bg-gold/20 text-cream"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ControlButton({
  onClick,
  active,
  label,
  icon: Icon,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-gold/30 bg-burgundy text-cream hover:bg-burgundy-dark"
          : "border-gold/50 bg-gold/15 text-gold-light hover:bg-gold/25"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
