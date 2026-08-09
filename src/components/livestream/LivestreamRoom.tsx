"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Hand,
  MessageCircle,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  Square,
  ThumbsDown,
  ThumbsUp,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { ShowMoreList } from "@/components/ShowMoreList";
import { useLivestream, type GalleryMember } from "@/hooks/useLivestream";
import { useAppPath } from "@/hooks/useAppBase";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ImmersiveMobileTabs } from "@/components/layout/ImmersiveMobileTabs";
import { MeetingChat } from "@/components/livestream/MeetingChat";
import { MemberJoinLink } from "@/components/livestream/MemberJoinLink";
import { MeetingEndedScreen } from "@/components/livestream/MeetingEndedScreen";
import { LivestreamHostStage } from "@/components/livestream/room/LivestreamHostStage";
import { LivestreamMemberStage } from "@/components/livestream/room/LivestreamMemberStage";
import { CameraDeviceSelect } from "@/components/livestream/CameraDeviceSelect";
import { AudioDeviceSelect } from "@/components/livestream/AudioDeviceSelect";
import { YouTubeStreamPanel } from "@/components/livestream/YouTubeStreamPanel";
import { BlockedUsersPanel } from "@/components/livestream/BlockedUsersPanel";
import { HostPrivateMessagePanel } from "@/components/livestream/HostPrivateMessagePanel";
import { MemberMessagesPopover } from "@/components/livestream/MemberMessagesPopover";
type Props = {
  meetingToken: string;
  meetingTitle: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  isHost: boolean;
  hostId: string;
};

export function LivestreamRoom({
  meetingToken,
  meetingTitle,
  userId,
  userName,
  avatarUrl,
  isHost,
  hostId,
}: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const livestreamPath = useAppPath("/livestream");
  const adminPath = useAppPath("/admin");
  const [mobileTab, setMobileTab] = useState<"video" | "chat" | "people">("video");
  const [privateMessageMember, setPrivateMessageMember] = useState<{
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null>(null);

  const {
    localVideoRef,
    remoteVideoRef,
    remoteHostCameraVideoRef,
    isLive,
    isMuted,
    isCameraOff,
    isRemoteCameraOff,
    isRemoteScreenSharing,
    isScreenSharing,
    localStream,
    remoteStream,
    isSavingRecording,
    videoInputDevices,
    audioInputDevices,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    switchVideoDevice,
    switchAudioDevice,
    switchFacingMode,
    refreshMediaInputDevices,
    isRefreshingDevices,
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
    endBroadcast,
    toggleHand,
    sendReaction,
    kickViewer,
    meetingEnded,
  } = useLivestream({
    meetingToken,
    meetingTitle,
    userId,
    userName,
    isHost,
    hostId,
    onKicked: () => router.push(`${livestreamPath}?removed=1`),
  });

  const raisedHands = useMemo(
    () => participants.filter((p) => p.handRaised && p.user.id !== hostId),
    [participants, hostId],
  );
  const viewers = useMemo(
    () => participants.filter((p) => p.user.id !== hostId),
    [participants, hostId],
  );

  const hostProfile = useMemo(() => {
    const host = participants.find((p) => p.user.id === hostId);
    return {
      userId: hostId,
      name: host?.user.name ?? meetingTitle,
      avatarUrl: host?.user.avatarUrl ?? null,
    };
  }, [participants, hostId, meetingTitle]);

  const hostSelfTile = useMemo((): GalleryMember | null => {
    if (!isHost || !isScreenSharing || !localStream) return null;
    return {
      userId,
      name: userName,
      avatarUrl: avatarUrl ?? null,
      stream: localStream,
      cameraOn: !isCameraOff,
      micOn: !isMuted,
      connected: true,
    };
  }, [
    isHost,
    isScreenSharing,
    localStream,
    userId,
    userName,
    avatarUrl,
    isCameraOff,
    isMuted,
  ]);

  if (meetingEnded) {
    return (
      <MeetingEndedScreen
        meetingTitle={meetingTitle}
        variant={isHost ? "host" : "viewer"}
        onContinue={() => router.push(isHost ? adminPath : livestreamPath)}
      />
    );
  }

  return (
    <div className="flex h-mobile-immersive min-h-0 flex-col overflow-hidden bg-burgundy-deep lg:h-[calc(100vh-80px)] lg:flex-row">
      {/* Main stage */}
      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col ${
          isMobile && mobileTab !== "video" ? "hidden lg:flex" : ""
        }`}
      >
        {isHost ? (
          <>
            <LivestreamHostStage
              meetingTitle={meetingTitle}
              viewerCount={viewerCount}
              isLive={isLive}
              isScreenSharing={isScreenSharing}
              isCameraOff={isCameraOff}
              error={error}
              userId={userId}
              userName={userName}
              avatarUrl={avatarUrl}
              localVideoRef={localVideoRef}
              hostSelfTile={hostSelfTile}
              galleryMembers={galleryMembers}
              memberVideoEnabled={memberVideoEnabled}
              memberMicEnabled={memberMicEnabled}
            />

            {/* Host controls */}
            <div className="z-20 shrink-0 border-t border-gold/30 bg-burgundy-dark px-2 py-2.5 sm:px-4 sm:py-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <YouTubeStreamPanel meetingTitle={meetingTitle} disabled={!isLive} />
                <button
                  type="button"
                  disabled={isSavingRecording}
                  onClick={() => void endBroadcast()}
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-gold/60 bg-burgundy-dark px-3 py-2 text-xs font-bold text-cream transition hover:bg-burgundy disabled:opacity-60 sm:text-sm"
                >
                  <Square className="h-4 w-4 fill-current" />
                  {isSavingRecording ? "Ending..." : "End Livestream"}
                </button>
                <CameraDeviceSelect
                  devices={videoInputDevices}
                  selectedDeviceId={selectedVideoDeviceId}
                  onChange={(deviceId) => void switchVideoDevice(deviceId)}
                  onRefresh={() => void refreshMediaInputDevices()}
                  onFlip={() => void switchFacingMode()}
                  showFlip={isMobile}
                  refreshing={isRefreshingDevices}
                />
                <AudioDeviceSelect
                  devices={audioInputDevices}
                  selectedDeviceId={selectedAudioDeviceId}
                  onChange={(deviceId) => void switchAudioDevice(deviceId)}
                  onRefresh={() => void refreshMediaInputDevices()}
                  refreshing={isRefreshingDevices}
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
            <LivestreamMemberStage
              meetingTitle={meetingTitle}
              isLive={isLive}
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              isRemoteCameraOff={isRemoteCameraOff}
              isRemoteScreenSharing={isRemoteScreenSharing}
              memberVideoEnabled={memberVideoEnabled}
              memberMicEnabled={memberMicEnabled}
              hostProfile={hostProfile}
              userId={userId}
              userName={userName}
              avatarUrl={avatarUrl}
              remoteVideoRef={remoteVideoRef}
              remoteHostCameraVideoRef={remoteHostCameraVideoRef}
              localVideoRef={localVideoRef}
            />

            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-gold/20 bg-burgundy-dark px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
              <CameraDeviceSelect
                devices={videoInputDevices}
                selectedDeviceId={selectedVideoDeviceId}
                onChange={(deviceId) => void switchVideoDevice(deviceId)}
                onRefresh={() => void refreshMediaInputDevices()}
                onFlip={() => void switchFacingMode()}
                showFlip={isMobile}
                refreshing={isRefreshingDevices}
              />
              <AudioDeviceSelect
                devices={audioInputDevices}
                selectedDeviceId={selectedAudioDeviceId}
                onChange={(deviceId) => void switchAudioDevice(deviceId)}
                onRefresh={() => void refreshMediaInputDevices()}
                refreshing={isRefreshingDevices}
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
              <MemberMessagesPopover userId={userId} />
              <button
                type="button"
                onClick={() => router.push(livestreamPath)}
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

      {/* Sidebar — chat & host tools */}
      <div
        className={`flex min-h-0 w-full flex-col border-t border-gold/20 lg:h-auto lg:w-[28rem] lg:shrink-0 lg:border-l lg:border-t-0 xl:w-[32rem] ${
          isMobile
            ? mobileTab === "video"
              ? "hidden lg:flex"
              : "min-h-0 flex-1 border-t-0"
            : "max-lg:h-[38vh]"
        }`}
      >
        {isHost && (!isMobile || mobileTab === "people") && (
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
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setPrivateMessageMember({
                          id: p.user.id,
                          name: p.user.name,
                          avatarUrl: p.user.avatarUrl,
                        })
                      }
                      className="text-xs font-semibold text-gold hover:text-gold-light"
                    >
                      Message
                    </button>
                    <button
                      type="button"
                      onClick={() => void kickViewer(p.user.id)}
                      className="text-xs text-gold-light/70 hover:text-gold"
                    >
                      Remove
                    </button>
                  </div>
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

        {isHost && privateMessageMember && (!isMobile || mobileTab === "people") && (
          <HostPrivateMessagePanel
            member={privateMessageMember}
            hostId={userId}
            onClose={() => setPrivateMessageMember(null)}
          />
        )}

        {(!isMobile || mobileTab === "chat") && (
        <div className="min-h-0 flex-1">
          <MeetingChat meetingToken={meetingToken} userId={userId} isAdmin={isHost} />
        </div>
        )}
      </div>

      {isMobile && (
        <ImmersiveMobileTabs
          active={mobileTab}
          onChange={(id) => setMobileTab(id as "video" | "chat" | "people")}
          tabs={[
            { id: "video", label: "Video", icon: Video },
            { id: "chat", label: "Chat", icon: MessageCircle },
            ...(isHost
              ? [{ id: "people", label: "People", icon: Users, badge: viewerCount }]
              : []),
          ]}
        />
      )}
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
