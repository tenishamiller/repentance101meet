export const MEETING_DELETE_GRACE_MS = 15 * 60 * 1000;

export function meetingDeleteRemainingMs(purgeAt: Date | string) {
  return Math.max(0, new Date(purgeAt).getTime() - Date.now());
}

export function formatDeleteCountdown(purgeAt: Date | string) {
  const totalSeconds = Math.ceil(meetingDeleteRemainingMs(purgeAt) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function isMeetingPendingDeletion(meeting: {
  deletedAt?: Date | string | null;
  purgeAt?: Date | string | null;
}) {
  if (!meeting.deletedAt || !meeting.purgeAt) return false;
  return meetingDeleteRemainingMs(meeting.purgeAt) > 0;
}
