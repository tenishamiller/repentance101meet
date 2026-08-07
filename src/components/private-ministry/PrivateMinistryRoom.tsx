"use client";

import { useRouter } from "next/navigation";
import {
  Circle,
  Download,
  Heart,
  Mic,
  MicOff,
  PhoneOff,
  Shield,
  Video,
  VideoOff,
} from "lucide-react";
import { TEACHER_NAME } from "@/lib/brand";
import { UserAvatar } from "@/components/UserAvatar";
import { useLivestream } from "@/hooks/useLivestream";
import { MeetingChat } from "@/components/livestream/MeetingChat";

type Peer = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type Props = {
  meetingToken: string;
  meetingTitle: string;
  userId: string;
  userName: string;
  isHost: boolean;
  hostId: string;
  peer: Peer;
};

export function PrivateMinistryRoom({
  meetingToken,
  meetingTitle,
  userId,
  isHost,
  hostId,
  peer,
}: Props) {
  const router = useRouter();

  const {
    localVideoRef,
    remoteVideoRef,
    isLive,
    isMuted,
    isCameraOff,
    isRecording,
    isSavingRecording,
    error,
    toggleMute,
    toggleCamera,
    beginRecording,
    endBroadcast,
  } = useLivestream({
    meetingToken,
    meetingTitle,
    userId,
    userName: isHost ? TEACHER_NAME : peer.name,
    isHost,
    hostId,
    mode: "private",
    onMeetingEnded: () => router.push("/personal-ministry?ended=1"),
  });

  const peerLabel = isHost ? peer.name : TEACHER_NAME;

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col bg-burgundy-deep lg:flex-row">
      <div className="flex flex-1 flex-col">
        {isHost && (
          <div className="border-b border-gold/30 bg-gradient-to-r from-burgundy-deep to-burgundy px-4 py-3">
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
                  onClick={async () => {
                    await endBroadcast();
                    router.push("/personal-ministry?ended=1");
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-gold bg-burgundy-dark px-4 py-2 text-sm font-bold text-cream hover:bg-burgundy disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {isSavingRecording ? "Saving..." : "End Session"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative flex-1 bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-contain"
          />

          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-4 right-4 h-28 w-40 rounded-xl border-2 border-gold/50 object-cover shadow-2xl sm:h-36 sm:w-52"
          />

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
          <div className="border-t border-gold/30 bg-burgundy px-4 py-3 text-sm text-gold-light">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-gold/20 bg-burgundy-dark px-4 py-3">
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
            onClick={() => router.push("/personal-ministry")}
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-burgundy px-5 py-2.5 text-sm font-semibold text-gold-light hover:bg-burgundy-dark"
          >
            <PhoneOff className="h-4 w-4" />
            Leave
          </button>
        </div>
      </div>

      <div className="flex h-80 w-full flex-col border-t border-gold/20 lg:h-auto lg:w-80 lg:border-l lg:border-t-0">
        <div className="border-b border-gold/20 bg-burgundy p-4">
          <div className="flex items-center gap-3">
            <UserAvatar
              userId={peer.id}
              name={peer.name}
              avatarUrl={peer.avatarUrl}
              size="md"
            />
            <div>
              <p className="font-serif font-semibold text-cream">{peerLabel}</p>
              <p className="text-xs text-gold-light/70">
                {isHost ? "Member you're ministering to" : "Your pastor"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <MeetingChat meetingToken={meetingToken} userId={userId} isAdmin={isHost} />
        </div>
      </div>
    </div>
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
