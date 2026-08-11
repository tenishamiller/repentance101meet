const STORAGE_KEY = "r101-member-join-media";
const TTL_MS = 24 * 60 * 60 * 1000;

export type MemberJoinMediaPrefs = {
  cameraOn: boolean;
  micOn: boolean;
};

type Stored = MemberJoinMediaPrefs & { expiresAt: number };

const DEFAULT: MemberJoinMediaPrefs = { cameraOn: false, micOn: false };

export function getMemberJoinMediaPrefs(): MemberJoinMediaPrefs {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Stored;
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return DEFAULT;
    }
    return { cameraOn: !!parsed.cameraOn, micOn: !!parsed.micOn };
  } catch {
    return DEFAULT;
  }
}

export function saveMemberJoinMediaPrefs(prefs: MemberJoinMediaPrefs) {
  if (typeof window === "undefined") return;
  try {
    const stored: Stored = {
      cameraOn: prefs.cameraOn,
      micOn: prefs.micOn,
      expiresAt: Date.now() + TTL_MS,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* private browsing / quota */
  }
}
