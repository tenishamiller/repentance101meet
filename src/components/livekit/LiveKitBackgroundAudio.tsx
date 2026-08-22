"use client";

import { useEffect, useState } from "react";
import { useAudioPlayback, useConnectionState, useRoomContext } from "@livekit/components-react";
import { ConnectionState, RoomEvent } from "livekit-client";
import { MINISTRY_NAME } from "@/lib/brand";

type Props = {
  meetingTitle?: string;
  resumeLabel?: string;
};

/** Keeps livestream audio playing in background and offers tap-to-resume when the browser pauses it. */
export function LiveKitBackgroundAudio({
  meetingTitle,
  resumeLabel = "Tap to connect livestream audio",
}: Props) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { canPlayAudio, startAudio } = useAudioPlayback(room);
  const [needsResume, setNeedsResume] = useState(false);

  useEffect(() => {
    setNeedsResume(!canPlayAudio);
  }, [canPlayAudio]);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;

    const resumePlayback = () => {
      if (document.visibilityState !== "visible") return;
      void startAudio().catch(() => {
        setNeedsResume(true);
      });
    };

    void startAudio().catch(() => {
      setNeedsResume(true);
    });

    const onPlaybackStatus = (canPlay: boolean) => {
      setNeedsResume(!canPlay);
      if (canPlay) return;
      void startAudio().catch(() => setNeedsResume(true));
    };

    room.on(RoomEvent.AudioPlaybackStatusChanged, onPlaybackStatus);
    document.addEventListener("visibilitychange", resumePlayback);
    window.addEventListener("focus", resumePlayback);
    window.addEventListener("pageshow", resumePlayback);
    navigator.mediaDevices?.addEventListener("devicechange", resumePlayback);

    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
        });
      } catch {
        /* unsupported or denied */
      }
    };
    const onVisibilityForWakeLock = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
      }
    };
    void requestWakeLock();
    document.addEventListener("visibilitychange", onVisibilityForWakeLock);

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: meetingTitle?.trim() || "Livestream",
        artist: MINISTRY_NAME,
      });
      navigator.mediaSession.playbackState = "playing";
      try {
        navigator.mediaSession.setActionHandler("play", () => {
          void startAudio().then(() => setNeedsResume(false));
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          /* keep stream connected; OS pause is informational only */
        });
      } catch {
        /* some browsers reject custom handlers */
      }
    }

    return () => {
      room.off(RoomEvent.AudioPlaybackStatusChanged, onPlaybackStatus);
      document.removeEventListener("visibilitychange", resumePlayback);
      document.removeEventListener("visibilitychange", onVisibilityForWakeLock);
      window.removeEventListener("focus", resumePlayback);
      window.removeEventListener("pageshow", resumePlayback);
      navigator.mediaDevices?.removeEventListener("devicechange", resumePlayback);
      void wakeLock?.release().catch(() => undefined);
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "none";
        navigator.mediaSession.metadata = null;
        try {
          navigator.mediaSession.setActionHandler("play", null);
          navigator.mediaSession.setActionHandler("pause", null);
        } catch {
          /* ignore */
        }
      }
    };
  }, [connectionState, meetingTitle, room, startAudio]);

  if (!needsResume) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(4.5rem+env(safe-area-inset-top,0px))] z-[80] flex justify-center px-4 lg:top-auto lg:bottom-6">
      <button
        type="button"
        onClick={() => {
          void startAudio()
            .then(() => setNeedsResume(false))
            .catch(() => setNeedsResume(true));
        }}
        className="pointer-events-auto rounded-full border border-gold/50 bg-burgundy-dark/95 px-4 py-2.5 text-sm font-semibold text-cream shadow-lg backdrop-blur"
      >
        {resumeLabel}
      </button>
    </div>
  );
}
