"use client";

import { useCallback, useState } from "react";
import "@livekit/components-styles";
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from "@livekit/components-react";

type TokenResponse = {
  token: string;
  serverUrl: string;
  roomName: string;
  isHost: boolean;
};

/** Hidden Phase 1 spike — join a meeting room via LiveKit (admin testing only). */
export function LiveKitSpikeClient({ meetingToken }: { meetingToken: string }) {
  const [credentials, setCredentials] = useState<TokenResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const connect = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/meetings/${meetingToken}/livekit-token`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not get LiveKit token");
        setCredentials(null);
        return;
      }
      setCredentials(data as TokenResponse);
    } catch {
      setError("Network error while fetching LiveKit token");
      setCredentials(null);
    } finally {
      setLoading(false);
    }
  }, [meetingToken]);

  if (!credentials) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-gold/30 bg-burgundy p-6 text-cream">
        <h1 className="font-serif text-xl font-semibold text-gold-light">LiveKit spike</h1>
        <p className="mt-2 text-sm text-gold-light/80">
          Phase 0 test for meeting token{" "}
          <code className="rounded bg-burgundy-dark px-1.5 py-0.5 text-xs">{meetingToken}</code>.
          Start or join the livestream as host first, then connect here.
        </p>
        {error && <p className="mt-3 text-sm text-gold">{error}</p>}
        <button
          type="button"
          disabled={loading}
          onClick={() => void connect()}
          className="btn-primary mt-4 disabled:opacity-60"
        >
          {loading ? "Connecting…" : "Connect with LiveKit"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[24rem] flex-col overflow-hidden rounded-xl border border-gold/30 bg-black">
      <LiveKitRoom
        token={credentials.token}
        serverUrl={credentials.serverUrl}
        connect
        audio
        video
        data-lk-theme="default"
        style={{ height: "100%" }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
