"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Circle,
  Heart,
  MessageCircle,
  Mic,
  MicOff,
  PhoneOff,
  Shield,
  Square,
  Video,
  VideoOff,
} from "lucide-react";
import { MuteIndicator } from "@/components/livestream/MuteIndicator";
import { UserAvatar } from "@/components/UserAvatar";
import { useMeetingPresence } from "@/hooks/useMeetingPresence";
import { useLiveKitStage } from "@/hooks/useLiveKitStage";
import { usePrivateMinistryRecording } from "@/hooks/usePrivateMinistryRecording";
import { useAppPath } from "@/hooks/useAppBase";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ImmersiveMobileTabs } from "@/components/layout/ImmersiveMobileTabs";
import { MeetingChat } from "@/components/livestream/MeetingChat";
import { MemberMessagesPopover } from "@/components/livestream/MemberMessagesPopover";
import { CameraDeviceSelect } from "@/components/livestream/CameraDeviceSelect";
import { AudioDeviceSelect } from "@/components/livestream/AudioDeviceSelect";
import { BlockedUsersPanel } from "@/components/livestream/BlockedUsersPanel";
import { OnboardingDecisionModal } from "@/components/onboarding/OnboardingDecisionModal";
import { LiveKitMeetingShell } from "@/components/livekit/LiveKitMeetingShell";
import { LiveKitVideoTile } from "@/components/livekit/LiveKitVideoTile";

type Peer = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type Props = {
  meetingToken: string;
  meetingTitle: string;
  sessionId: string;
  userId: string;
  userName: string;
  isHost: boolean;
  hostId: string;
  peer: Peer;
  isOnboardingApproval?: boolean;
  invitedUserId?: string | null;
};

export function PrivateMinistryRoom(props: Props) {
  return (
    <LiveKitMeetingShell
      meetingToken={props.meetingToken}
      meetingTitle={props.meetingTitle}
      enableAudioUnlock
    >
      <PrivateMinistryRoomContent {...props} />
    </LiveKitMeetingShell>
  );
}

function PrivateMinistryRoomContent({
  meetingToken,
  meetingTitle,
  sessionId,
  userId,
  userName,
  isHost,
  hostId,
  peer,
  isOnboardingApproval = false,
  invitedUserId,
}: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const messagesPath = useAppPath("/messages");
  const personalMinistryPath = useAppPath("/personal-ministry");
  const adminPath = useAppPath("/admin");
  const [mobileTab, setMobileTab] = useState<"video" | "chat">("video");
  const [chatUnread, setChatUnread] = useState(0);
  const chatVisible = !isMobile || mobileTab === "chat";
  const [showDecision, setShowDecision] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);

  const { leaveMeeting, meetingEnded } = useMeetingPresence({
    meetingToken,
    userId,
    isHost,
    hostId,
    onMeetingEnded: () =>
      router.push(isOnboardingApproval ? messagesPath : `${personalMinistryPath}?ended=1`),
  });

  useEffect(() => {
    if (meetingEnded && !isHost) {
      router.push(isOnboardingApproval ? messagesPath : `${personalMinistryPath}?ended=1`);
    }
  }, [meetingEnded, isHost, isOnboardingApproval, messagesPath, personalMinistryPath, router]);

  const {
    isLive,
    isMuted,
    isCameraOff,
    isRemoteCameraOff,
    isRemoteMuted,
    hostMainTrack,
    localCameraTrack,
    videoInputDevices,
    audioInputDevices,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    switchVideoDevice,
    switchAudioDevice,
    switchFacingMode,
    refreshMediaInputDevices,
    isRefreshingDevices,
    mediaError,
    toggleMute,
    toggleCamera,
  } = useLiveKitStage({
    hostId,
    userId,
    isHost,
    memberVideoEnabled: true,
    memberMicEnabled: true,
    mode: "private",
  });

  const {
    isRecording,
    isSavingRecording,
    error: recordingError,
    beginRecording,
    finalizeRecording,
  } = usePrivateMinistryRecording({ meetingToken, meetingTitle, isHost });

  const error = recordingError || mediaError;
  const peerLabel = isHost ? peer.name : `Your Session Host ${peer.name}`;

  async function handleEndSession() {
    await finalizeRecording();
    await fetch(`/api/meetings/${meetingToken}/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "host-ended", toUserId: null, payload: {} }),
    });

    const res = await fetch("/api/private-ministry", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action: "end" }),
    });
    const data = await res.json();

    if (isHost && isOnboardingApproval && data.requiresOnboardingDecision && invitedUserId) {
      setShowDecision(true);
      return;
    }

    router.push(isOnboardingApproval ? messagesPath : `${personalMinistryPath}?ended=1`);
  }

  async function handleLeave() {
    await leaveMeeting();
    router.push(isOnboardingApproval ? messagesPath : personalMinistryPath);
  }

  async function handleDecision(decision: "approve" | "deny") {
    if (!invitedUserId) return;
    setDecisionLoading(true);
    const res = await fetch("/api/admin/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "decide",
        userId: invitedUserId,
        decision,
        meetingId: sessionId,
        confirm: decision === "deny" ? true : undefined,
      }),
    });
    if (!res.ok) {
      setDecisionLoading(false);
      return;
    }
    setDecisionLoading(false);
    setShowDecision(false);
    router.push(`${adminPath}?tab=members`);
  }

  if (meetingEnded && !isHost) {
    return null;
  }

  return (
    <>
      {showDecision && invitedUserId && (
        <OnboardingDecisionModal
          memberName={peer.name}
          userId={invitedUserId}
          meetingId={sessionId}
          loading={decisionLoading}
          onApprove={() => void handleDecision("approve")}
          onDeny={() => void handleDecision("deny")}
          onCancel={() => {
            setShowDecision(false);
            router.push(`${adminPath}?tab=members`);
          }}
        />
      )}
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-burgundy-deep lg:min-h-0 lg:flex-row">
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
            isMobile && mobileTab !== "video" ? "hidden lg:flex" : ""
          }`}
        >
          {isHost && (
            <div className="shrink-0 border-b border-gold/30 bg-gradient-to-r from-burgundy-deep to-burgundy px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-gold-light">
                  <Shield className="h-4 w-4 text-gold" />
                  <span>
                    Private session with <strong className="text-cream">{peer.name}</strong>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={beginRecording}
                      disabled={!isLive}
                      className="inline-flex items-center gap-2 rounded-lg border border-gold/50 bg-gold/15 px-4 py-2 text-sm font-semibold text-gold-light hover:bg-gold/25 disabled:opacity-50"
                    >
                      <Circle className="h-3.5 w-3.5 fill-gold text-gold" />
                      Record Session
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-gold bg-burgundy-dark px-3 py-1.5 text-xs font-bold text-gold">
                      <Circle className="h-2.5 w-2.5 fill-gold" />
                      REC
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={isSavingRecording}
                    onClick={() => void handleEndSession()}
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-gold bg-burgundy-dark px-4 py-2 text-sm font-bold text-cream hover:bg-burgundy disabled:opacity-60"
                  >
                    <Square className="h-4 w-4 fill-current" />
                    {isSavingRecording ? "Ending..." : "End Session"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="relative grid min-h-0 flex-1 grid-cols-2 grid-rows-1 overflow-hidden bg-black">
            <div className="relative min-h-0 min-w-0 overflow-hidden border-r border-gold/20 bg-black">
              <LiveKitVideoTile
                trackRef={hostMainTrack}
                userId={peer.id}
                name={peer.name}
                avatarUrl={peer.avatarUrl}
                cameraOff={isRemoteCameraOff}
                videoClassName="h-full w-full object-contain"
                lowLatency
              />
              <MuteIndicator visible={isRemoteMuted} />
            </div>

            <div className="relative min-h-0 min-w-0 overflow-hidden">
              <LiveKitVideoTile
                trackRef={localCameraTrack}
                userId={userId}
                name={userName}
                cameraOff={isCameraOff}
              />
              <MuteIndicator visible={isMuted} />
            </div>

            {!isLive && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-burgundy-deep/95">
                <Heart className="h-10 w-10 animate-pulse text-gold" />
                <p className="font-serif text-lg font-semibold text-cream">
                  Connecting with {peerLabel}...
                </p>
                <p className="text-sm text-gold-light/70">This room is private — just the two of you</p>
              </div>
            )}

            <div className="absolute left-4 top-4 flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-burgundy-dark/90 px-3 py-1.5 text-xs font-bold text-gold-light backdrop-blur">
                <Shield className="h-3.5 w-3.5" />
                Private
              </div>
              {isLive && (
                <div className="badge-live !text-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
                  </span>
                  Connected
                </div>
              )}
            </div>

            <div className="absolute bottom-4 left-4 rounded-xl border border-gold/30 bg-burgundy-dark/80 px-4 py-2 backdrop-blur">
              <p className="font-serif text-sm font-semibold text-cream">{meetingTitle}</p>
              <p className="text-xs text-gold-light/80">One-on-one with {peerLabel}</p>
            </div>
          </div>

          {error && (
            <div className="shrink-0 border-t border-gold/30 bg-burgundy px-4 py-3 text-sm text-gold-light">
              {error}
            </div>
          )}

          <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-gold/20 bg-burgundy-dark px-4 py-3">
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
            {!isHost && <MemberMessagesPopover userId={userId} />}
            <button
              type="button"
              onClick={() => void handleLeave()}
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-burgundy px-5 py-2.5 text-sm font-semibold text-gold-light hover:bg-burgundy-dark"
            >
              <PhoneOff className="h-4 w-4" />
              Leave
            </button>
          </div>
        </div>

        <div
          className={`relative z-30 isolate flex min-h-0 w-full flex-col overflow-hidden border-t border-gold/20 bg-burgundy-dark lg:h-auto lg:w-80 lg:shrink-0 lg:border-l lg:border-t-0 xl:w-96 ${
            isMobile
              ? mobileTab === "video"
                ? "hidden lg:flex"
                : "h-0 min-h-0 flex-1 border-t-0"
              : "max-lg:h-[38vh]"
          }`}
        >
          {(!isMobile || mobileTab === "chat") && (
            <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 border-b border-gold/20 bg-burgundy p-4">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    userId={peer.id}
                    name={peer.name}
                    avatarUrl={peer.avatarUrl}
                    size="md"
                  />
                  <div>
                    <p className="font-serif font-semibold text-cream">{peerLabel}</p>
                    {isHost && (
                      <p className="text-xs text-gold-light/70">Member you&apos;re ministering to</p>
                    )}
                  </div>
                </div>
                {isHost && <BlockedUsersPanel meetingToken={meetingToken} />}
              </div>
              <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
                <MeetingChat
                  meetingToken={meetingToken}
                  userId={userId}
                  isAdmin={isHost}
                  isVisible={chatVisible}
                  onUnreadChange={setChatUnread}
                />
              </div>
            </div>
          )}
        </div>

        {isMobile && (
          <ImmersiveMobileTabs
            active={mobileTab}
            onChange={(id) => setMobileTab(id as "video" | "chat")}
            tabs={[
              { id: "video", label: "Video", icon: Video },
              { id: "chat", label: "Chat", icon: MessageCircle, badge: chatUnread },
            ]}
          />
        )}
      </div>
    </>
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
