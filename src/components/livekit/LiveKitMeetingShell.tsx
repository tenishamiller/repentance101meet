"use client";

import { useCallback, useEffect, useState } from "react";
import "@livekit/components-styles";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import type { MediaDeviceFailure } from "livekit-client";

type TokenResponse = {
  token: string;
  serverUrl: string;
  roomName: string;
};

type Props = {
  meetingToken: string;
  children: React.ReactNode;
  onDisconnected?: () => void;
};

export function LiveKitMeetingShell({ meetingToken, children, onDisconnected }: Props) {
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
      });
    } catch {
      setError("Network error while connecting to video");
      setCredentials(null);
    } finally {
      setLoading(false);
    }
  }, [meetingToken]);

  useEffect(() => {
    void loadToken();
  }, [loadToken]);

  const displayError = error || roomError;

  if (loading) {
    return (
      <div className="flex min-h-[12rem] flex-1 items-center justify-center bg-burgundy-deep">
        <p className="font-serif text-gold-light">Connecting video…</p>
      </div>
    );
  }

  if (displayError || !credentials) {
    return (
      <div className="flex min-h-[12rem] flex-1 flex-col items-center justify-center gap-3 bg-burgundy-deep px-4 text-center">
        <p className="max-w-md text-sm text-gold-light">{displayError || "Video unavailable"}</p>
        <button type="button" onClick={() => void loadToken()} className="btn-primary text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={credentials.token}
      serverUrl={credentials.serverUrl}
      connect
      audio
      video
      connectOptions={{ autoSubscribe: true }}
      onDisconnected={onDisconnected}
      onError={(err) => setRoomError(err.message || "Could not connect to video room")}
      onMediaDeviceFailure={(failure?: MediaDeviceFailure) => {
        setRoomError(
          failure
            ? `Camera or microphone error: ${failure}. Check browser permissions and try again.`
            : "Could not access camera or microphone.",
        );
      }}
      data-lk-theme="default"
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
