/** Client-safe LiveKit helpers (no server SDK imports). */
export function getPublicLiveKitUrl() {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() || "";
}
