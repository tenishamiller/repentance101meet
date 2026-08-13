"use client";

import { useEffect } from "react";
import { useConnectionState, useRoomContext } from "@livekit/components-react";
import { ConnectionState, RoomEvent } from "livekit-client";
import { preventLiveKitFreezeDisconnect } from "@/lib/livekit-background";

/** Prevents LiveKit from disconnecting livestream listeners when the tab is backgrounded or frozen. */
export function LiveKitPersistInBackground() {
  const room = useRoomContext();
  const connectionState = useConnectionState();

  useEffect(() => {
    const keepConnected = () => {
      preventLiveKitFreezeDisconnect(room);
    };

    keepConnected();
    room.on(RoomEvent.Connected, keepConnected);
    room.on(RoomEvent.Reconnected, keepConnected);

    return () => {
      room.off(RoomEvent.Connected, keepConnected);
      room.off(RoomEvent.Reconnected, keepConnected);
    };
  }, [room]);

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      preventLiveKitFreezeDisconnect(room);
    }
  }, [connectionState, room]);

  return null;
}
