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
