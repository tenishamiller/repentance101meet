"use client";

import { useState } from "react";
import Link from "next/link";
import { Circle, Mic, MicOff, Video, VideoOff } from "lucide-react";
import type { MemberJoinMediaPrefs } from "@/lib/member-join-media";
import { primeJoinMedia } from "@/lib/member-join-media";
import { cn } from "@/lib/utils";

type Props = {
  meetingTitle: string;
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

export function RecordingConsentGate({ meetingTitle, onAccept }: Props) {
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [joining, setJoining] = useState(false);

  async function handleAccept() {
    if (joining) return;
    setJoining(true);
    await primeJoinMedia(cameraOn, micOn);
    onAccept({ cameraOn, micOn });
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center bg-burgundy-deep px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-gold/30 bg-cream p-6 shadow-2xl sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-burgundy">
          <Circle className="h-3 w-3 fill-burgundy text-burgundy" />
          Livestream
        </div>

        <h1 className="font-serif text-2xl font-bold text-burgundy sm:text-3xl">
          Before you join
        </h1>
        <p className="mt-2 text-sm text-burgundy/65">{meetingTitle}</p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-burgundy/85">
          <p>
            This session is a live teaching broadcast. Chat and participation may be visible to other
            members in the room.
          </p>
          <p>
            By joining, you agree to participate respectfully in this live ministry session.
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
            Camera and microphone turn on when you join. Turn either off here first if you want to
            enter quietly. You can change these anytime after you join.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void handleAccept()}
            disabled={joining}
            className="btn-primary flex-1"
          >
            {joining ? "Joining..." : "I understand — join livestream"}
          </button>
          <Link href="/livestream" className="btn-secondary flex-1 text-center">
            Leave
          </Link>
        </div>
      </div>
    </div>
  );
}
