"use client";

import { useEffect, useState } from "react";
import { useAudioPlayback, useConnectionState, useRoomContext } from "@livekit/components-react";
import { ConnectionState, RoomEvent } from "livekit-client";
import { MINISTRY_NAME } from "@/lib/brand";

type Props = {
  meetingTitle?: string;
};

/** Keeps livestream audio playing in background and offers tap-to-resume when the browser pauses it. */
export function LiveKitBackgroundAudio({ meetingTitle }: Props) {
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
      if (document.visibilityState === "visible") {
        void startAudio().catch(() => setNeedsResume(true));
      }
    };

    room.on(RoomEvent.AudioPlaybackStatusChanged, onPlaybackStatus);
    document.addEventListener("visibilitychange", resumePlayback);
    window.addEventListener("focus", resumePlayback);
    window.addEventListener("pageshow", resumePlayback);
    navigator.mediaDevices?.addEventListener("devicechange", resumePlayback);

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: meetingTitle?.trim() || "Livestream",
        artist: MINISTRY_NAME,
      });
      navigator.mediaSession.playbackState = "playing";
    }

    return () => {
      room.off(RoomEvent.AudioPlaybackStatusChanged, onPlaybackStatus);
      document.removeEventListener("visibilitychange", resumePlayback);
      window.removeEventListener("focus", resumePlayback);
      window.removeEventListener("pageshow", resumePlayback);
      navigator.mediaDevices?.removeEventListener("devicechange", resumePlayback);
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "none";
        navigator.mediaSession.metadata = null;
      }
    };
  }, [connectionState, meetingTitle, room, startAudio]);

  if (!needsResume) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 lg:bottom-6">
      <button
        type="button"
        onClick={() => {
          void startAudio()
            .then(() => setNeedsResume(false))
            .catch(() => setNeedsResume(true));
        }}
        className="pointer-events-auto rounded-full border border-gold/50 bg-burgundy-dark/95 px-4 py-2.5 text-sm font-semibold text-cream shadow-lg backdrop-blur"
      >
        Tap to resume livestream audio
      </button>
    </div>
  );
}
