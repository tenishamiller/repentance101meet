export type MemberJoinMediaPrefs = {
  cameraOn: boolean;
  micOn: boolean;
};

type StoredSession = MemberJoinMediaPrefs & { consented: true };

const sessionKey = (meetingToken: string) => `r101-livestream-join:${meetingToken}`;

/** Join choices for this browser tab session — survives refresh, cleared when the member leaves. */
export function getMemberJoinSession(meetingToken: string): MemberJoinMediaPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(sessionKey(meetingToken));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    return { cameraOn: !!parsed.cameraOn, micOn: !!parsed.micOn };
  } catch {
    return null;
  }
}

export function hasMemberJoinSession(meetingToken: string) {
  return getMemberJoinSession(meetingToken) !== null;
}

export function saveMemberJoinSession(meetingToken: string, prefs: MemberJoinMediaPrefs) {
  if (typeof window === "undefined") return;
  try {
    const stored: StoredSession = {
      cameraOn: prefs.cameraOn,
      micOn: prefs.micOn,
      consented: true,
    };
    window.sessionStorage.setItem(sessionKey(meetingToken), JSON.stringify(stored));
  } catch {
    /* private browsing / quota */
  }
}

export function clearMemberJoinSession(meetingToken: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(sessionKey(meetingToken));
  } catch {
    /* ignore */
  }
}

const privateSessionKey = (meetingToken: string) => `r101-private-join:${meetingToken}`;

export function getPrivateJoinSession(meetingToken: string): MemberJoinMediaPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(privateSessionKey(meetingToken));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    return { cameraOn: !!parsed.cameraOn, micOn: !!parsed.micOn };
  } catch {
    return null;
  }
}

export function savePrivateJoinSession(meetingToken: string, prefs: MemberJoinMediaPrefs) {
  if (typeof window === "undefined") return;
  try {
    const stored: StoredSession = {
      cameraOn: prefs.cameraOn,
      micOn: prefs.micOn,
      consented: true,
    };
    window.sessionStorage.setItem(privateSessionKey(meetingToken), JSON.stringify(stored));
  } catch {
    /* private browsing / quota */
  }
}

/** Prime mic/camera permission in the same user gesture that starts the session. */
export async function primeJoinMedia(cameraOn: boolean, micOn: boolean) {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
  if (!cameraOn && !micOn) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: micOn,
      video: cameraOn,
    });
    for (const track of stream.getTracks()) track.stop();
  } catch {
    /* LiveKit will ask again after join if the browser blocked this tap. */
  }
}
