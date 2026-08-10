"use client";

import { useCallback, useEffect, useState } from "react";
import "@livekit/components-styles";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { getPublicLiveKitUrl } from "@/lib/livekit-server";

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
  const [loading, setLoading] = useState(true);
  const publicUrl = getPublicLiveKitUrl();

  const loadToken = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/meetings/${meetingToken}/livekit-token`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not connect to video room");
        setCredentials(null);
        return;
      }
      setCredentials({
        token: data.token,
        serverUrl: data.serverUrl || publicUrl,
        roomName: data.roomName,
      });
    } catch {
      setError("Network error while connecting to video");
      setCredentials(null);
    } finally {
      setLoading(false);
    }
  }, [meetingToken, publicUrl]);

  useEffect(() => {
    void loadToken();
  }, [loadToken]);

  if (loading) {
    return (
      <div className="flex min-h-[12rem] flex-1 items-center justify-center bg-burgundy-deep">
        <p className="font-serif text-gold-light">Connecting video…</p>
      </div>
    );
  }

  if (error || !credentials) {
    return (
      <div className="flex min-h-[12rem] flex-1 flex-col items-center justify-center gap-3 bg-burgundy-deep px-4 text-center">
        <p className="text-sm text-gold-light">{error || "Video unavailable"}</p>
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
      onDisconnected={onDisconnected}
      data-lk-theme="default"
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
