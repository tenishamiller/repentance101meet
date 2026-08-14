import { prisma } from "@/lib/db";
import { logMemberActivity } from "@/lib/member-activity";
import { USER_DELETE_GRACE_MS } from "@/lib/user-deletion-shared";

export { USER_DELETE_GRACE_MS } from "@/lib/user-deletion-shared";

export function userPurgeAt(from = new Date()) {
  return new Date(from.getTime() + USER_DELETE_GRACE_MS);
}

/** Active members — not soft-deleted. */
export function activeUserFilter() {
  return { deletedAt: null };
}

/** Members visible in admin (active + pending permanent deletion). */
export function visibleUserFilter(now = new Date()) {
  return {
    OR: [{ deletedAt: null }, { purgeAt: { gt: now } }],
  };
}

export async function softDeleteUser(
  userId: string,
  adminId: string,
  reason?: string,
) {
  const member = await prisma.user.findFirst({
    where: { id: userId, role: "MEMBER", deletedAt: null },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  const now = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: now,
      purgeAt: userPurgeAt(now),
      deletedById: adminId,
    },
  });

  await logMemberActivity({
    userId,
    type: "MEMBER_DELETED",
    actorId: adminId,
    reason: reason ?? "Profile removed by ministry leadership",
    label: reason ?? "Profile removed — 30-day restore window",
  });
}

export async function restoreDeletedUser(userId: string, adminId: string) {
  const member = await prisma.user.findFirst({
    where: {
      id: userId,
      role: "MEMBER",
      deletedAt: { not: null },
      purgeAt: { gt: new Date() },
    },
  });

  if (!member) {
    throw new Error("Member not found or restore window expired");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: null,
      purgeAt: null,
      deletedById: null,
    },
  });

  await logMemberActivity({
    userId,
    type: "MEMBER_RESTORED",
    actorId: adminId,
    label: "Profile restored by ministry leadership",
  });
}

export async function permanentlyDeleteUser(
  userId: string,
  adminId?: string,
  label = "Profile permanently removed after 30-day window",
) {
  if (adminId) {
    await logMemberActivity({
      userId,
      type: "MEMBER_PURGED",
      actorId: adminId,
      label,
    });
  }

  await prisma.user.delete({ where: { id: userId } });
}

/** Permanently remove members whose 30-day restore window has expired. */
export async function purgeExpiredUsers() {
  const now = new Date();
  const expired = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      deletedAt: { not: null },
      purgeAt: { lte: now },
    },
    select: { id: true },
  });

  for (const user of expired) {
    await permanentlyDeleteUser(user.id);
  }

  return expired.length;
}

export const DELETED_MEMBER_LOGIN_MESSAGE =
  "Your account has been removed from Repentance 101. Please contact ministry leadership directly if you have questions.";
