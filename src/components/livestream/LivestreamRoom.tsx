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
import { useMeetingPresence } from "@/hooks/useMeetingPresence";
import { useLiveKitStage } from "@/hooks/useLiveKitStage";
import { useAppPath } from "@/hooks/useAppBase";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ImmersiveMobileTabs } from "@/components/layout/ImmersiveMobileTabs";
import { MeetingChat } from "@/components/livestream/MeetingChat";
import { MeetingEndedScreen } from "@/components/livestream/MeetingEndedScreen";
import { RemovedFromMeetingScreen } from "@/components/livestream/RemovedFromMeetingScreen";
import { LivestreamHostStage } from "@/components/livestream/room/LivestreamHostStage";
import { LivestreamMemberStage } from "@/components/livestream/room/LivestreamMemberStage";
import { CameraDeviceSelect } from "@/components/livestream/CameraDeviceSelect";
import { AudioDeviceSelect } from "@/components/livestream/AudioDeviceSelect";
import { YouTubeStreamPanel } from "@/components/livestream/YouTubeStreamPanel";
import { BlockedUsersPanel } from "@/components/livestream/BlockedUsersPanel";
import { HostPrivateMessagePanel } from "@/components/livestream/HostPrivateMessagePanel";
import { MemberMessagesPopover } from "@/components/livestream/MemberMessagesPopover";
import { VideoLayoutSelect } from "@/components/livestream/VideoLayoutSelect";
import { LiveKitMeetingShell } from "@/components/livekit/LiveKitMeetingShell";
import {
  getMemberVideoLayout,
  setMemberVideoLayout,
  type MemberVideoLayout,
} from "@/lib/video-layout";

type Props = {
  meetingToken: string;
  meetingTitle: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  isHost: boolean;
  hostId: string;
};

export function LivestreamRoom(props: Props) {
  return (
    <LiveKitMeetingShell meetingToken={props.meetingToken}>
      <LivestreamRoomContent {...props} />
    </LiveKitMeetingShell>
  );
}

function LivestreamRoomContent({
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
  const [memberVideoLayout, setMemberVideoLayoutState] = useState<MemberVideoLayout>("pip");
  const [privateMessageMember, setPrivateMessageMember] = useState<{
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null>(null);

  useEffect(() => {
    setMemberVideoLayoutState(getMemberVideoLayout());
  }, []);

  function updateMemberVideoLayout(layout: MemberVideoLayout) {
    setMemberVideoLayoutState(layout);
    setMemberVideoLayout(layout);
  }

  const {
    participants,
    viewerCount,
    handRaised,
    thumbsUp,
    thumbsDown,
    myReaction,
    memberVideoEnabled,
    memberMicEnabled,
    meetingEnded,
    wasRemoved,
    isSavingRecording,
    error: presenceError,
    toggleHand,
    sendReaction,
    toggleMemberVideo,
    toggleMemberMic,
    kickViewer,
    leaveMeeting,
    endBroadcast,
  } = useMeetingPresence({
    meetingToken,
    userId,
    isHost,
    hostId,
  });

  const {
    isLive,
    isConnecting,
    isMuted,
    isCameraOff,
    isRemoteCameraOff,
    isRemoteMuted,
    isRemoteScreenSharing,
    isScreenSharing,
    hostMainTrack,
    hostCameraPipTrack,
    localCameraTrack,
    remoteMemberParticipants,
    remoteParticipants,
    videoInputDevices,
    audioInputDevices,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    switchVideoDevice,
    switchAudioDevice,
    switchFacingMode,
    refreshMediaInputDevices,
    isRefreshingDevices,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    mediaError,
    waitingForHostVideo,
    waitingForSelfVideo,
  } = useLiveKitStage({
    hostId,
    userId,
    isHost,
    memberVideoEnabled,
    memberMicEnabled,
    mode: "livestream",
  });

  const error = [presenceError, mediaError].filter(Boolean).join(" ");

  const raisedHands = useMemo(
    () =>
      participants
        .filter((p) => p.handRaised && p.user.id !== hostId)
        .map((p) => ({ userId: p.user.id, name: p.user.name })),
    [participants, hostId],
  );
  const viewers = useMemo(
    () => participants.filter((p) => p.user.id !== hostId),
    [participants, hostId],
  );
  const viewerMicOnById = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const participant of remoteMemberParticipants) {
      map.set(participant.identity, participant.isMicrophoneEnabled);
    }
    return map;
  }, [remoteMemberParticipants]);

  const hostProfile = useMemo(() => {
    const host = participants.find((p) => p.user.id === hostId);
    return {
      userId: hostId,
      name: host?.user.name ?? meetingTitle,
      avatarUrl: host?.user.avatarUrl ?? null,
    };
  }, [participants, hostId, meetingTitle]);

  const hostSelfTile = useMemo(() => {
    if (!isHost || !isScreenSharing) return null;
    return {
      participantIdentity: userId,
      name: userName,
      avatarUrl: avatarUrl ?? null,
      trackRef: hostCameraPipTrack,
      cameraOff: isCameraOff,
      micOn: !isMuted,
    };
  }, [
    isHost,
    isScreenSharing,
    userId,
    userName,
    avatarUrl,
    hostCameraPipTrack,
    isCameraOff,
    isMuted,
  ]);

  if (wasRemoved) {
    return (
      <RemovedFromMeetingScreen
        meetingTitle={meetingTitle}
        onContinue={() => router.replace(livestreamPath)}
      />
    );
  }

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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-burgundy-deep lg:h-[calc(100vh-80px)] lg:flex-row">
      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
          isMobile && mobileTab !== "video" ? "hidden lg:flex" : ""
        }`}
      >
        {isHost ? (
          <>
            <LivestreamHostStage
              meetingTitle={meetingTitle}
              viewerCount={viewerCount}
              isLive={isLive}
              isConnecting={isConnecting}
              isScreenSharing={isScreenSharing}
              isCameraOff={isCameraOff}
              isMuted={isMuted}
              error={error}
              userId={userId}
              userName={userName}
              avatarUrl={avatarUrl}
              hostMainTrack={hostMainTrack}
              hostSelfTile={hostSelfTile}
              remoteParticipants={remoteParticipants}
              participants={participants}
              hostId={hostId}
              memberVideoEnabled={memberVideoEnabled}
              memberMicEnabled={memberMicEnabled}
              raisedHands={raisedHands}
              thumbsUp={thumbsUp}
              thumbsDown={thumbsDown}
            />

            <div className="z-20 shrink-0 border-t border-gold/30 bg-burgundy-dark px-2 py-2.5 sm:px-4 sm:py-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <YouTubeStreamPanel />
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
                  title="Share a browser tab and enable “Share tab audio” to include video sound for members."
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
              isConnecting={isConnecting}
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              isRemoteCameraOff={isRemoteCameraOff}
              isRemoteMuted={isRemoteMuted}
              isRemoteScreenSharing={isRemoteScreenSharing}
              memberVideoEnabled={memberVideoEnabled}
              memberMicEnabled={memberMicEnabled}
              memberVideoLayout={memberVideoLayout}
              hostProfile={hostProfile}
              userId={userId}
              userName={userName}
              avatarUrl={avatarUrl}
              hostMainTrack={hostMainTrack}
              hostCameraPipTrack={hostCameraPipTrack}
              localCameraTrack={localCameraTrack}
              waitingForHostVideo={waitingForHostVideo}
              waitingForSelfVideo={waitingForSelfVideo}
              raisedHands={raisedHands}
              thumbsUp={thumbsUp}
              thumbsDown={thumbsDown}
              handRaised={handRaised}
              myReaction={myReaction}
            />

            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-gold/20 bg-burgundy-dark px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
              <VideoLayoutSelect
                mode="member"
                value={memberVideoLayout}
                onChange={updateMemberVideoLayout}
              />
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
                onClick={() => {
                  void leaveMeeting().finally(() => router.push(livestreamPath));
                }}
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

      <div
        className={`flex min-h-0 w-full flex-col overflow-hidden border-t border-gold/20 lg:h-full lg:min-h-0 lg:w-[28rem] lg:shrink-0 lg:border-l lg:border-t-0 xl:w-[32rem] ${
          isMobile
            ? mobileTab === "video"
              ? "hidden lg:flex"
              : "min-h-0 flex-1 border-t-0"
            : "max-lg:max-h-[38vh] max-lg:shrink-0"
        }`}
      >
        {isHost && (!isMobile || mobileTab === "people") && (
          <section
            className={`flex min-h-0 flex-col overflow-hidden border-b border-gold/20 bg-burgundy ${
              isMobile && mobileTab === "people"
                ? "min-h-0 flex-1"
                : "max-h-[min(320px,42%)] shrink-0 lg:max-h-[min(360px,45%)]"
            }`}
          >
            <div className="shrink-0 px-3 pb-2 pt-3 sm:px-4 sm:pt-4">
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
              <h3 className="flex items-center gap-2 font-serif text-sm font-semibold text-gold-light">
                <Users className="h-4 w-4 text-gold" />
                Viewers ({viewerCount})
              </h3>
            </div>
            <div className="chat-scroll chat-scroll-dark min-h-0 flex-1 space-y-1.5 px-3 pb-3 sm:px-4 sm:pb-4">
              {viewers.length === 0 ? (
                <p className="text-sm text-gold-light/60">Waiting for viewers to join...</p>
              ) : (
                viewers.map((p) => (
                  <div
                    key={p.user.id}
                    className="flex items-center justify-between rounded-lg border border-gold/10 bg-burgundy-dark px-2.5 py-1.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <UserAvatar
                        userId={p.user.id}
                        name={p.user.name}
                        avatarUrl={p.user.avatarUrl}
                        size="md"
                      />
                      <span className="truncate text-sm text-cream">{p.user.name}</span>
                      {p.handRaised && <span title="Hand raised">✋</span>}
                      {(!memberMicEnabled || viewerMicOnById.get(p.user.id) === false) && (
                        <MicOff
                          className="h-3.5 w-3.5 shrink-0 text-gold-light/70"
                          aria-label="Muted"
                        />
                      )}
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
                ))
              )}

              {raisedHands.length > 0 && (
                <div className="mt-2 rounded-lg border border-gold/40 bg-gold/10 p-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold">Raised Hands</p>
                  <ul className="mt-1 space-y-0.5">
                    {raisedHands.map((p) => (
                      <li key={p.userId} className="text-sm text-cream">
                        ✋ {p.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <BlockedUsersPanel meetingToken={meetingToken} />
            </div>
          </section>
        )}

        {isHost && privateMessageMember && (!isMobile || mobileTab === "people") && (
          <HostPrivateMessagePanel
            member={privateMessageMember}
            hostId={userId}
            onClose={() => setPrivateMessageMember(null)}
          />
        )}

        {(!isMobile || mobileTab === "chat") && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
