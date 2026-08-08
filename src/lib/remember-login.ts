export const REMEMBER_EMAIL_KEY = "r101_remember_email";

/** Stay signed in on a trusted device */
export const REMEMBER_ME_MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days

/** Standard browser session (until closed or 24h) */
export const DEFAULT_SESSION_MAX_AGE_SEC = 24 * 60 * 60; // 1 day

export function loadRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "";
}

export function persistRememberedEmail(email: string, remember: boolean) {
  if (typeof window === "undefined") return;
  if (remember) {
    localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
  } else {
    localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }
}
