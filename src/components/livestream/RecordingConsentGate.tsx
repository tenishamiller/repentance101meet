"use client";

import Link from "next/link";
import { Circle, VideoOff } from "lucide-react";

type Props = {
  meetingTitle: string;
  onAccept: () => void;
};

export function RecordingConsentGate({ meetingTitle, onAccept }: Props) {
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
          <div className="rounded-xl border border-gold/25 bg-cream-dark px-4 py-3">
            <p className="flex items-start gap-2 font-semibold text-burgundy">
              <VideoOff className="mt-0.5 h-4 w-4 shrink-0 text-gold-muted" />
              Prefer not to appear on camera?
            </p>
            <p className="mt-2 text-burgundy/75">
              Turn off your camera after you join. You can still listen, chat, and participate with
              your camera off.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onAccept} className="btn-primary flex-1">
            I understand — join livestream
          </button>
          <Link href="/livestream" className="btn-secondary flex-1 text-center">
            Leave
          </Link>
        </div>
      </div>
    </div>
  );
}

export function hasRecordingConsent(meetingToken: string) {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(`r101-recording-consent:${meetingToken}`) === "1";
  } catch {
    return false;
  }
}

export function saveRecordingConsent(meetingToken: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`r101-recording-consent:${meetingToken}`, "1");
  } catch {
    /* ignore private mode */
  }
}
