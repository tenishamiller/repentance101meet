"use client";

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
import { TEACHER_NAME } from "@/lib/brand";
import { UserAvatar } from "@/components/UserAvatar";
import { useLivestream } from "@/hooks/useLivestream";
import { MeetingChat } from "@/components/livestream/MeetingChat";
import { MemberJoinLink } from "@/components/livestream/MemberJoinLink";

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

  const {
    localVideoRef,
    remoteVideoRef,
    isLive,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isRecording,
    isSavingRecording,
    participants,
    viewerCount,
    error,
    handRaised,
    thumbsUp,
    thumbsDown,
    myReaction,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    beginRecording,
    endBroadcast,
    toggleHand,
    sendReaction,
    kickViewer,
  } = useLivestream({
    meetingToken,
    meetingTitle,
    userId,
    userName,
    isHost,
    hostId,
    onKicked: () => router.push("/livestream?removed=1"),
    onMeetingEnded: () => router.push("/livestream?ended=1"),
  });

  const raisedHands = participants.filter((p) => p.handRaised && p.user.id !== hostId);

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col bg-burgundy-deep lg:flex-row">
      <div className="flex flex-1 flex-col">
        {/* Norman's host command bar — logo burgundy & gold */}
        {isHost && (
          <div className="border-b-2 border-gold/40 bg-gradient-to-r from-burgundy-deep via-burgundy to-burgundy-dark px-4 py-4 shadow-lg">
            {!isRecording ? (
              <div className="mx-auto max-w-3xl text-center">
                <p className="mb-2 font-serif text-sm font-semibold uppercase tracking-widest text-gold-light">
                  {TEACHER_NAME} — before you teach
                </p>
                <button
                  type="button"
                  onClick={beginRecording}
                  disabled={!isLive}
                  className="group relative w-full overflow-hidden rounded-2xl border-2 border-gold bg-gradient-to-b from-gold to-gold-muted px-8 py-5 font-serif text-xl font-bold text-burgundy-deep shadow-[0_0_30px_rgba(201,162,39,0.45)] transition hover:from-gold-light hover:to-gold disabled:opacity-50 animate-pulse hover:animate-none"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <Circle className="h-6 w-6 fill-burgundy text-burgundy" />
                    Record This Meeting
                  </span>
                </button>
                <p className="mt-2 text-xs text-gold-light/80">
                  Tap to start saving — unlimited hours · MP4 download when you end
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-gold" />
                  </span>
                  <div>
                    <p className="font-serif text-lg font-bold text-cream">Recording</p>
                    <p className="text-xs text-gold-light">Unlimited duration · saved for download</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSavingRecording}
                  onClick={async () => {
                    await endBroadcast();
                    router.push("/admin?recording=1");
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-gold bg-cream/10 px-5 py-2.5 text-sm font-bold text-gold-light backdrop-blur transition hover:bg-gold/20 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {isSavingRecording ? "Saving MP4..." : "End & Download MP4"}
                </button>
              </div>
            )}

            {/* Share screen — large, impossible to miss */}
            <div className="mx-auto mt-4 max-w-3xl">
              <button
                type="button"
                onClick={() => void toggleScreenShare()}
                className={`flex w-full items-center justify-center gap-3 rounded-xl border-2 px-6 py-3.5 text-base font-bold transition ${
                  isScreenSharing
                    ? "border-gold bg-gold text-burgundy-deep shadow-lg"
                    : "border-gold/60 bg-burgundy-dark/60 text-gold-light hover:border-gold hover:bg-burgundy-dark"
                }`}
              >
                {isScreenSharing ? (
                  <>
                    <MonitorOff className="h-5 w-5" />
                    Stop Sharing Screen — viewers see your screen now
                  </>
                ) : (
                  <>
                    <MonitorUp className="h-5 w-5" />
                    Share Your Screen with Everyone
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Video stage */}
        <div className="relative flex-1 bg-black">
          {isHost ? (
            <>
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
              {isLive && !isRecording && (
                <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-burgundy-deep/80 via-transparent to-transparent pb-24">
                  <p className="rounded-full border border-gold/50 bg-burgundy-dark/90 px-6 py-2 text-sm font-semibold text-gold-light">
                    ↑ Tap &ldquo;Record This Meeting&rdquo; to begin saving your teaching
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
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
                className={`absolute bottom-4 right-4 h-24 w-32 rounded-xl border-2 border-gold/50 object-cover shadow-2xl sm:h-28 sm:w-40 ${
                  isCameraOff ? "opacity-40" : ""
                }`}
              />
              {!isLive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-burgundy-deep">
                  <Radio className="h-10 w-10 animate-pulse text-gold" />
                  <p className="font-serif text-lg font-semibold text-cream">
                    Connecting to {TEACHER_NAME}...
                  </p>
                  <p className="text-sm text-gold-light/70">Allow camera & mic to participate</p>
                </div>
              )}
            </>
          )}

          {/* Live + screen share badges */}
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            {isLive && (
              <div className="badge-live">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
                </span>
                LIVE
              </div>
            )}
            {isHost && isRecording && (
              <div className="inline-flex items-center gap-2 rounded-full border border-gold bg-burgundy-dark/90 px-3 py-1.5 text-xs font-bold text-gold">
                <Circle className="h-2.5 w-2.5 fill-gold text-gold" />
                REC
              </div>
            )}
            {isScreenSharing && (
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/20 px-3 py-1.5 text-xs font-bold text-cream backdrop-blur">
                <MonitorUp className="h-3.5 w-3.5" />
                Screen shared with viewers
              </div>
            )}
          </div>

          <div className="absolute bottom-4 left-4 rounded-xl border border-gold/30 bg-burgundy-dark/80 px-4 py-2 backdrop-blur">
            <p className="font-serif text-sm font-semibold text-cream">{meetingTitle}</p>
            {isHost ? (
              <p className="text-xs text-gold-light/80">
                {viewerCount} watching
                {isScreenSharing ? " · screen visible to all" : ""}
              </p>
            ) : (
              <p className="text-xs text-gold-light/80">
                With {TEACHER_NAME}
                {isMuted ? " · muted" : ""}
                {isCameraOff ? " · camera off" : ""}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="border-t border-gold/30 bg-burgundy px-4 py-3 text-sm text-gold-light">
            {error}
          </div>
        )}

        {/* Secondary controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-gold/20 bg-burgundy-dark px-4 py-3">
          {isHost ? (
            <>
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
              {!isRecording && (
                <button
                  type="button"
                  onClick={beginRecording}
                  className="flex items-center gap-2 rounded-full border-2 border-gold bg-gold px-5 py-2.5 text-sm font-bold text-burgundy-deep lg:hidden"
                >
                  <Circle className="h-4 w-4 fill-burgundy" />
                  Record
                </button>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="flex h-96 w-full flex-col border-t border-gold/20 lg:h-auto lg:w-96 lg:border-l lg:border-t-0">
        {isHost && (
          <div className="border-b border-gold/20 bg-burgundy p-4">
            <MemberJoinLink meetingToken={meetingToken} variant="room" />
            {(thumbsUp > 0 || thumbsDown > 0) && (
              <div className="mb-3 flex gap-3 text-sm">
                {thumbsUp > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-3 py-1 font-semibold text-gold-light">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {thumbsUp}
                  </span>
                )}
                {thumbsDown > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-burgundy-dark px-3 py-1 font-semibold text-cream/80">
                    <ThumbsDown className="h-3.5 w-3.5" />
                    {thumbsDown}
                  </span>
                )}
              </div>
            )}
            <h3 className="mb-3 flex items-center gap-2 font-serif text-sm font-semibold text-gold-light">
              <Users className="h-4 w-4 text-gold" />
              Viewers ({viewerCount})
            </h3>
            <ul className="max-h-32 space-y-2 overflow-y-auto">
              {participants
                .filter((p) => p.user.id !== hostId)
                .map((p) => (
                  <li
                    key={p.user.id}
                    className="flex items-center justify-between rounded-lg border border-gold/10 bg-burgundy-dark px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        userId={p.user.id}
                        name={p.user.name}
                        avatarUrl={p.user.avatarUrl}
                        size="sm"
                      />
                      <span className="text-sm text-cream">{p.user.name}</span>
                      {p.handRaised && <span title="Hand raised">✋</span>}
                      {p.reaction === "UP" && (
                        <ThumbsUp className="h-3.5 w-3.5 text-gold" aria-label="Thumbs up" />
                      )}
                      {p.reaction === "DOWN" && (
                        <ThumbsDown className="h-3.5 w-3.5 text-cream/70" aria-label="Thumbs down" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void kickViewer(p.user.id)}
                      className="text-xs text-gold-light/70 hover:text-gold"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              {viewerCount === 0 && (
                <li className="text-sm text-gold-light/60">Waiting for viewers to join...</li>
              )}
            </ul>

            {raisedHands.length > 0 && (
              <div className="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gold">
                  Raised Hands
                </p>
                <ul className="mt-2 space-y-1">
                  {raisedHands.map((p) => (
                    <li key={p.user.id} className="text-sm text-cream">
                      ✋ {p.user.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

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
