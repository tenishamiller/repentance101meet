type AudioSessionNavigator = Navigator & {
  audioSession?: { type: string };
};

/**
 * iOS switches to a playback-only session when remote share audio starts,
 * which mutes the local mic. Keep capture + playback together.
 */
export function lockPlayAndRecordAudioSession() {
  if (typeof navigator === "undefined") return;
  const session = (navigator as AudioSessionNavigator).audioSession;
  if (!session) return;
  try {
    session.type = "play-and-record";
  } catch {
    /* Safari versions without AudioSession */
  }
}
