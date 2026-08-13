"use client";

import { useEffect, useRef } from "react";
import { useConnectionState, useRoomContext } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";

/** Apply a refreshed JWT without remounting LiveKitRoom (avoids room-wide blackouts). */
export function LiveKitTokenSync({
  serverUrl,
  token,
}: {
  serverUrl: string;
  token: string;
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const initialTokenRef = useRef(token);
  const lastAppliedRef = useRef(token);

  useEffect(() => {
    if (token === lastAppliedRef.current) return;
    lastAppliedRef.current = token;

    if (token === initialTokenRef.current) return;
    if (connectionState === ConnectionState.Disconnected) return;

    void room.connect(serverUrl, token, { autoSubscribe: true }).catch(() => {
      /* keep current session if refresh fails */
    });
  }, [connectionState, room, serverUrl, token]);

  return null;
}
