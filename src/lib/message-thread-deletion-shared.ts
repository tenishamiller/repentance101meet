export const MESSAGE_THREAD_DELETE_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

export function messageThreadPurgeAt(from = new Date()) {
  return new Date(from.getTime() + MESSAGE_THREAD_DELETE_GRACE_MS);
}

export function messageThreadDeleteRemainingMs(purgeAt: Date | string) {
  return Math.max(0, new Date(purgeAt).getTime() - Date.now());
}

export function formatMessageThreadDeleteCountdown(purgeAt: Date | string) {
  const ms = messageThreadDeleteRemainingMs(purgeAt);
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function isMessageThreadPendingDeletion(thread: {
  deletedAt?: Date | string | null;
  purgeAt?: Date | string | null;
}) {
  if (!thread.deletedAt || !thread.purgeAt) return false;
  return messageThreadDeleteRemainingMs(thread.purgeAt) > 0;
}

export function sortedParticipantIds(userA: string, userB: string) {
  return userA < userB ? ([userA, userB] as const) : ([userB, userA] as const);
}
