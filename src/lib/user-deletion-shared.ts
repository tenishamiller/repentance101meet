export const USER_DELETE_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

export function userDeleteRemainingMs(purgeAt: Date | string) {
  return Math.max(0, new Date(purgeAt).getTime() - Date.now());
}

export function formatUserDeleteCountdown(purgeAt: Date | string) {
  const ms = userDeleteRemainingMs(purgeAt);
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function isUserPendingDeletion(user: {
  deletedAt?: Date | string | null;
  purgeAt?: Date | string | null;
}) {
  if (!user.deletedAt || !user.purgeAt) return false;
  return userDeleteRemainingMs(user.purgeAt) > 0;
}
