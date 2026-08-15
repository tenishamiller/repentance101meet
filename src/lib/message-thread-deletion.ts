import { prisma } from "@/lib/db";
import {
  messageThreadPurgeAt,
  sortedParticipantIds,
} from "@/lib/message-thread-deletion-shared";

export {
  MESSAGE_THREAD_DELETE_GRACE_MS,
  formatMessageThreadDeleteCountdown,
  isMessageThreadPendingDeletion,
  messageThreadDeleteRemainingMs,
  messageThreadPurgeAt,
  sortedParticipantIds,
} from "@/lib/message-thread-deletion-shared";

export function activeConversationFilter() {
  return { deletedAt: null };
}

export function pendingDeletedConversationFilter(now = new Date()) {
  return {
    deletedAt: { not: null },
    purgeAt: { gt: now },
  };
}

/** Active admin↔member thread, or create a fresh one after a prior delete. */
export async function getOrCreateActiveAdminMemberConversation(memberUserId: string) {
  const existing = await prisma.messageConversation.findFirst({
    where: {
      kind: "ADMIN_MEMBER",
      memberUserId,
      ...activeConversationFilter(),
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.messageConversation.create({
    data: {
      kind: "ADMIN_MEMBER",
      memberUserId,
    },
  });
}

/** Active member↔member thread, or create a fresh one after a prior delete. */
export async function getOrCreateActiveMemberDmConversation(userA: string, userB: string) {
  const [participantAId, participantBId] = sortedParticipantIds(userA, userB);
  const existing = await prisma.messageConversation.findFirst({
    where: {
      kind: "MEMBER_DM",
      participantAId,
      participantBId,
      ...activeConversationFilter(),
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.messageConversation.create({
    data: {
      kind: "MEMBER_DM",
      participantAId,
      participantBId,
    },
  });
}

export async function softDeleteConversation(conversationId: string, deletedById: string) {
  const conversation = await prisma.messageConversation.findFirst({
    where: { id: conversationId, deletedAt: null },
  });
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const now = new Date();
  return prisma.messageConversation.update({
    where: { id: conversationId },
    data: {
      deletedAt: now,
      purgeAt: messageThreadPurgeAt(now),
      deletedById,
    },
  });
}

export async function restoreConversation(conversationId: string) {
  const conversation = await prisma.messageConversation.findFirst({
    where: {
      id: conversationId,
      ...pendingDeletedConversationFilter(),
    },
  });
  if (!conversation) {
    throw new Error("Conversation not found or restore window expired");
  }

  return prisma.messageConversation.update({
    where: { id: conversationId },
    data: {
      deletedAt: null,
      purgeAt: null,
      deletedById: null,
    },
  });
}

export async function permanentlyDeleteConversation(conversationId: string) {
  await prisma.messageConversation.delete({ where: { id: conversationId } });
}

export async function purgeExpiredConversations() {
  const now = new Date();
  const expired = await prisma.messageConversation.findMany({
    where: {
      deletedAt: { not: null },
      purgeAt: { lte: now },
    },
    select: { id: true },
  });

  for (const conversation of expired) {
    await permanentlyDeleteConversation(conversation.id);
  }

  return expired.length;
}

export function userCanAccessConversation(
  conversation: {
    kind: string;
    memberUserId: string | null;
    participantAId: string | null;
    participantBId: string | null;
  },
  userId: string,
  role: string,
) {
  if (conversation.kind === "ADMIN_MEMBER") {
    if (role === "ADMIN") return true;
    return conversation.memberUserId === userId;
  }
  return (
    conversation.participantAId === userId || conversation.participantBId === userId
  );
}
