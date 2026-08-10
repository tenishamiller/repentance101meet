export const MEETING_SIGNAL_TTL_MS = 60_000;

export function isMeetingSignalExpired(at: Date | string | null | undefined, now = Date.now()) {
  if (!at) return true;
  const timestamp = typeof at === "string" ? Date.parse(at) : at.getTime();
  if (Number.isNaN(timestamp)) return true;
  return now - timestamp > MEETING_SIGNAL_TTL_MS;
}

export function meetingSignalCutoff(now = Date.now()) {
  return new Date(now - MEETING_SIGNAL_TTL_MS);
}
