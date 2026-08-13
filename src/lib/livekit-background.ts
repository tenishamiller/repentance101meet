import type { Room } from "livekit-client";

/** LiveKit always registers a `freeze` listener that disconnects, even when disconnectOnPageLeave is false. */
export function preventLiveKitFreezeDisconnect(room: Room) {
  if (typeof window === "undefined") return;

  const handler = (room as unknown as { onPageLeave?: () => void | Promise<void> }).onPageLeave;
  if (typeof handler === "function") {
    window.removeEventListener("freeze", handler);
  }
}
