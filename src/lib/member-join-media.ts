type StoredSession = { consented: true };

const sessionKey = (meetingToken: string) => `r101-livestream-join:${meetingToken}`;

/** True when this browser tab already accepted the join warning for this meeting. */
export function hasMemberJoinSession(meetingToken: string) {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(sessionKey(meetingToken));
    if (!raw) return false;
    const parsed = JSON.parse(raw) as StoredSession;
    return parsed.consented === true;
  } catch {
    return false;
  }
}

export function saveMemberJoinSession(meetingToken: string) {
  if (typeof window === "undefined") return;
  try {
    const stored: StoredSession = { consented: true };
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
