"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "@livekit/components-styles";
import { LiveKitRoom, RoomAudioRenderer, useConnectionState } from "@livekit/components-react";
import { ConnectionState, type MediaDeviceFailure } from "livekit-client";
import { getLiveKitRoomOptions } from "@/lib/livekit-capture";
import { isLiveKitPermissionError } from "@/lib/livekit-errors";
import {
  LiveKitMeetingContext,
  type LiveKitMeetingContextValue,
} from "@/components/livekit/livekit-meeting-context";
import { LiveKitBackgroundAudio } from "@/components/livekit/LiveKitBackgroundAudio";
import { LiveKitPersistInBackground } from "@/components/livekit/LiveKitPersistInBackground";
import { LiveKitTokenSync } from "@/components/livekit/LiveKitTokenSync";

type TokenResponse = {
  token: string;
  serverUrl: string;
  roomName: string;
  isHost: boolean;
  memberVideoEnabled: boolean;
  memberMicEnabled: boolean;
};

type Props = {
  meetingToken: string;
  children: React.ReactNode;
  onDisconnected?: () => void;
  /** Livestream: stay connected and keep audio when the tab/app is backgrounded. */
  persistInBackground?: boolean;
  meetingTitle?: string;
  /** Livestream uses selective audio routing instead of the default renderer. */
  skipRoomAudio?: boolean;
};

function RoomErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="shrink-0 border-b border-gold/30 bg-burgundy px-4 py-2 text-center text-sm text-gold-light">
      {message}
    </div>
  );
}

function RoomConnectionMonitor({
  roomError,
  onRoomError,
}: {
  roomError: string;
  onRoomError: (message: string) => void;
}) {
  const connectionState = useConnectionState();

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      onRoomError("");
    }
  }, [connectionState, onRoomError]);

  return <RoomErrorBanner message={roomError} />;
}

export function LiveKitMeetingShell({
  meetingToken,
  children,
  onDisconnected,
  persistInBackground = false,
  meetingTitle,
  skipRoomAudio = false,
}: Props) {
  const livestreamShell = skipRoomAudio;
  const shellClass = livestreamShell
    ? "livestream-room flex h-full min-h-0 flex-1 flex-col"
    : "flex h-full min-h-0 flex-1 flex-col";

  const [credentials, setCredentials] = useState<TokenResponse | null>(null);
  const [error, setError] = useState("");
  const [roomError, setRoomError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadToken = useCallback(async () => {
    setLoading(true);
    setError("");
    setRoomError("");
    try {
      const res = await fetch(`/api/meetings/${meetingToken}/livekit-token`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not connect to video room");
        setCredentials(null);
        return;
      }
      if (!data.serverUrl || !data.token) {
        setError("Video server returned incomplete connection details.");
        setCredentials(null);
        return;
      }
      setCredentials({
        token: data.token,
        serverUrl: data.serverUrl,
        roomName: data.roomName,
        isHost: data.isHost === true,
        memberVideoEnabled: data.memberVideoEnabled !== false,
        memberMicEnabled: data.memberMicEnabled !== false,
      });
    } catch {
      setError("Network error while connecting to video");
      setCredentials(null);
    } finally {
      setLoading(false);
    }
  }, [meetingToken]);

  /** Refresh JWT after host media-policy change without unmounting the room UI. */
  const refreshToken = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings/${meetingToken}/livekit-token`);
      const data = await res.json();
      if (!res.ok || !data.serverUrl || !data.token) return;
      setCredentials({
        token: data.token,
        serverUrl: data.serverUrl,
        roomName: data.roomName,
        isHost: data.isHost === true,
        memberVideoEnabled: data.memberVideoEnabled !== false,
        memberMicEnabled: data.memberMicEnabled !== false,
      });
    } catch {
      /* member keeps watching; publish retry happens on next policy sync */
    }
  }, [meetingToken]);

  useEffect(() => {
    void loadToken();
  }, [loadToken]);

  const meetingContext = useMemo<LiveKitMeetingContextValue | null>(() => {
    if (!credentials) return null;
    return {
      isHost: credentials.isHost,
      memberVideoEnabled: credentials.memberVideoEnabled,
      memberMicEnabled: credentials.memberMicEnabled,
      reloadToken: refreshToken,
    };
  }, [credentials, refreshToken]);

  if (loading) {
    return (
      <div className={`${shellClass} items-center justify-center bg-burgundy-deep`}>
        <p className="font-serif text-cream">Connecting video…</p>
      </div>
    );
  }

  if (error || !credentials) {
    return (
      <div
        className={`${shellClass} flex-col items-center justify-center gap-3 bg-burgundy-deep px-4 text-center`}
      >
        <p className="max-w-md text-sm text-cream/90">{error || "Video unavailable"}</p>
        <button type="button" onClick={() => void loadToken()} className="btn-primary text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <LiveKitMeetingContext.Provider value={meetingContext}>
      <LiveKitRoom
        token={credentials.token}
        serverUrl={credentials.serverUrl}
        connect
        options={getLiveKitRoomOptions(persistInBackground)}
        connectOptions={{ autoSubscribe: true }}
        onDisconnected={onDisconnected}
        onConnected={() => setRoomError("")}
        onError={(err) => {
          const message = err.message || "Could not connect to video room";
          if (isLiveKitPermissionError(message)) return;
          setRoomError(message);
        }}
        onMediaDeviceFailure={(failure?: MediaDeviceFailure) => {
          setRoomError(
            failure
              ? `Camera or microphone error: ${failure}. Check browser permissions and try again.`
              : "Could not access camera or microphone.",
          );
        }}
        data-lk-theme="default"
        className={shellClass}
      >
        <LiveKitTokenSync serverUrl={credentials.serverUrl} token={credentials.token} />
        <RoomConnectionMonitor roomError={roomError} onRoomError={setRoomError} />
        {persistInBackground && (
          <>
            <LiveKitPersistInBackground />
            <LiveKitBackgroundAudio meetingTitle={meetingTitle} />
          </>
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        {!skipRoomAudio && <RoomAudioRenderer />}
      </LiveKitRoom>
    </LiveKitMeetingContext.Provider>
  );
}
