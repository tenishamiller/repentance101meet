"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Mic, MicOff, Shield, Video, VideoOff } from "lucide-react";
import {
  type MemberJoinMediaPrefs,
  primeJoinMedia,
  savePrivateJoinSession,
} from "@/lib/member-join-media";
import { cn } from "@/lib/utils";

type Props = {
  meetingTitle: string;
  peerName: string;
  meetingToken: string;
  leaveHref: string;
  onAccept: (media: MemberJoinMediaPrefs) => void;
};

function JoinMediaToggle({
  active,
  onClick,
  onLabel,
  offLabel,
  onIcon: OnIcon,
  offIcon: OffIcon,
}: {
  active: boolean;
  onClick: () => void;
  onLabel: string;
  offLabel: string;
  onIcon: React.ComponentType<{ className?: string }>;
  offIcon: React.ComponentType<{ className?: string }>;
}) {
  const Icon = active ? OnIcon : OffIcon;
  const label = active ? onLabel : offLabel;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition",
        active
          ? "border-gold/50 bg-gold/15 text-burgundy"
          : "border-gold/25 bg-cream-dark text-burgundy/80 hover:border-gold/40",
      )}
      aria-pressed={active}
    >
      <span className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            active ? "bg-gold/25 text-burgundy" : "bg-burgundy/10 text-burgundy/60",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="font-semibold">{label}</span>
      </span>
      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition",
          active ? "bg-gold" : "bg-burgundy/20",
        )}
        aria-hidden
      >
        <span
          className={cn(
            "absolute top-0.5 h-6 w-6 rounded-full bg-cream shadow transition",
            active ? "left-[calc(100%-1.625rem)]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function PrivateSessionJoinGate({
  meetingTitle,
  peerName,
  meetingToken,
  leaveHref,
  onAccept,
}: Props) {
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [joining, setJoining] = useState(false);

  async function handleAccept() {
    if (joining) return;
    setJoining(true);
    await primeJoinMedia(cameraOn, micOn);
    const prefs = { cameraOn, micOn };
    savePrivateJoinSession(meetingToken, prefs);
    onAccept(prefs);
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center bg-burgundy-deep px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-gold/30 bg-cream p-6 shadow-2xl sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-burgundy">
          <Shield className="h-3.5 w-3.5" />
          Private session
        </div>

        <h1 className="font-serif text-2xl font-bold text-burgundy sm:text-3xl">Before you join</h1>
        <p className="mt-2 text-sm text-burgundy/65">{meetingTitle}</p>
        <p className="mt-1 text-sm text-burgundy/55">
          One-on-one with <strong className="text-burgundy">{peerName}</strong>
        </p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-burgundy/85">
          <p>
            This room is private — just the two of you. Check your camera and microphone before
            entering.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-burgundy/55">
            Your camera and microphone
          </p>
          <JoinMediaToggle
            active={cameraOn}
            onClick={() => setCameraOn((on) => !on)}
            onLabel="Camera on"
            offLabel="Camera off"
            onIcon={Video}
            offIcon={VideoOff}
          />
          <JoinMediaToggle
            active={micOn}
            onClick={() => setMicOn((on) => !on)}
            onLabel="Microphone on"
            offLabel="Microphone off"
            onIcon={Mic}
            offIcon={MicOff}
          />
          <p className="text-xs text-burgundy/55">
            Tap join to allow your browser to use the selected devices. You can change them anytime
            in the session.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void handleAccept()}
            disabled={joining}
            className="btn-primary flex flex-1 items-center justify-center gap-2"
          >
            <Heart className="h-4 w-4" />
            {joining ? "Joining..." : "Join private session"}
          </button>
          <Link href={leaveHref} className="btn-secondary flex-1 text-center">
            Leave
          </Link>
        </div>
      </div>
    </div>
  );
}
