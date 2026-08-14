import { prisma } from "@/lib/db";
import type { MessageThreadKind } from "@/generated/prisma/client";
import {
  isMessageThreadRestorable,
  messageThreadPurgeAt,
} from "@/lib/message-thread-deletion-shared";

export {
  MESSAGE_THREAD_DELETE_GRACE_MS,
  formatMessageThreadDeleteCountdown,
  isMessageThreadRestorable,
  messageThreadDeleteRemainingMs,
  messageThreadPurgeAt,
} from "@/lib/message-thread-deletion-shared";

export type ThreadDeletion = {
  id: string;
  userId: string;
  kind: MessageThreadKind;
  otherUserId: string;
  seqFrom: number;
  seqTo: number;
  deletedAt: Date;
  purgeAt: Date;
  permanentlyDeletedAt: Date | null;
};

export type SeqRange = { seqFrom: number; seqTo: number };

function coversSeq(row: Pick<ThreadDeletion, "seqFrom" | "seqTo">, seq: number) {
  return seq >= row.seqFrom && seq <= row.seqTo;
}

export function deletionHidesSeq(row: ThreadDeletion, seq: number, now = new Date()) {
  if (!coversSeq(row, seq)) return false;
  if (row.permanentlyDeletedAt) return true;
  if (row.purgeAt <= now) return true;
  return true;
}

export function deletionIsGone(row: ThreadDeletion, now = new Date()) {
  return Boolean(row.permanentlyDeletedAt) || row.purgeAt <= now;
}

export function visibleInboxRanges(seqs: number[], deletions: ThreadDeletion[], now = new Date()) {
  const unique = [...new Set(seqs)].sort((a, b) => a - b);
  const hidden = unique.filter((seq) =>
    deletions.some((row) => deletionHidesSeq(row, seq, now)),
  );
  const visible = unique.filter((seq) => !hidden.includes(seq));
  if (visible.length === 0) return [];

  const hadSplit = deletions.length > 0;
  if (!hadSplit) {
    return [{ seqFrom: visible[0], seqTo: visible[visible.length - 1] }];
  }

  const ranges: SeqRange[] = [];
  let start = visible[0];
  let prev = visible[0];
  for (const seq of visible.slice(1)) {
    if (seq === prev + 1) {
      prev = seq;
      continue;
    }
    ranges.push({ seqFrom: start, seqTo: prev });
    start = seq;
    prev = seq;
  }
  ranges.push({ seqFrom: start, seqTo: prev });
  return ranges;
}

export async function listThreadDeletions(
  userId: string,
  kind?: MessageThreadKind,
  otherUserId?: string,
) {
  return prisma.deletedMessageThread.findMany({
    where: {
      userId,
      ...(kind ? { kind } : {}),
      ...(otherUserId ? { otherUserId } : {}),
    },
  });
}

export async function nextMembershipThreadSeq(threadUserId: string) {
  const latest = await prisma.membershipMessage.findFirst({
    where: { threadUserId },
    orderBy: { threadSeq: "desc" },
    select: { threadSeq: true },
  });
  const maxSeq = latest?.threadSeq ?? 0;
  if (maxSeq === 0) return 1;

  const adminIds = (
    await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    })
  ).map((row) => row.id);

  const deletions = await prisma.deletedMessageThread.findMany({
    where: {
      kind: "MEMBERSHIP",
      otherUserId: threadUserId,
      userId: { in: [...adminIds, threadUserId] },
    },
  });

  const currentHidden = deletions.some((row) => deletionHidesSeq(row, maxSeq));
  return currentHidden ? maxSeq + 1 : maxSeq;
}

export async function nextDmThreadSeq(meId: string, otherId: string) {
  const latest = await prisma.memberDirectMessage.findFirst({
    where: {
      OR: [
        { senderId: meId, recipientId: otherId },
        { senderId: otherId, recipientId: meId },
      ],
    },
    orderBy: { threadSeq: "desc" },
    select: { threadSeq: true },
  });
  const maxSeq = latest?.threadSeq ?? 0;
  if (maxSeq === 0) return 1;

  const deletions = await prisma.deletedMessageThread.findMany({
    where: {
      kind: "MEMBER_DM",
      OR: [
        { userId: meId, otherUserId: otherId },
        { userId: otherId, otherUserId: meId },
      ],
    },
  });

  const currentHidden = deletions.some((row) => deletionHidesSeq(row, maxSeq));
  return currentHidden ? maxSeq + 1 : maxSeq;
}

export function seqFilter(seqFrom?: number | null, seqTo?: number | null) {
  if (seqFrom == null || seqTo == null) return undefined;
  return { gte: seqFrom, lte: seqTo };
}

export function hiddenSeqsForUser(deletions: ThreadDeletion[], now = new Date()) {
  const hidden = new Set<number>();
  for (const row of deletions) {
    for (let seq = row.seqFrom; seq <= row.seqTo; seq += 1) {
      if (deletionHidesSeq(row, seq, now)) hidden.add(seq);
    }
  }
  return hidden;
}

export async function deleteMessageThread(input: {
  userId: string;
  kind: MessageThreadKind;
  otherUserId: string;
  seqFrom: number;
  seqTo: number;
}) {
  if (input.seqFrom > input.seqTo) {
    throw new Error("Invalid thread range");
  }

  const now = new Date();
  return prisma.deletedMessageThread.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      otherUserId: input.otherUserId,
      seqFrom: input.seqFrom,
      seqTo: input.seqTo,
      deletedAt: now,
      purgeAt: messageThreadPurgeAt(now),
    },
  });
}

export async function restoreMessageThread(userId: string, id: string) {
  const row = await prisma.deletedMessageThread.findFirst({
    where: { id, userId },
  });
  if (!row || !isMessageThreadRestorable(row)) {
    throw new Error("This conversation cannot be restored. The 30-day window has ended.");
  }

  await prisma.deletedMessageThread.delete({ where: { id } });
  return { ok: true };
}

export async function permanentlyDeleteMessageThread(userId: string, id: string) {
  const row = await prisma.deletedMessageThread.findFirst({
    where: { id, userId, permanentlyDeletedAt: null },
  });
  if (!row) {
    throw new Error("Conversation not found in Deleted.");
  }

  await prisma.deletedMessageThread.update({
    where: { id },
    data: { permanentlyDeletedAt: new Date() },
  });
  return { ok: true };
}

export async function purgeExpiredMessageThreads() {
  const now = new Date();
  const result = await prisma.deletedMessageThread.updateMany({
    where: {
      permanentlyDeletedAt: null,
      purgeAt: { lte: now },
    },
    data: { permanentlyDeletedAt: now },
  });
  return result.count;
}

export async function currentVisibleMembershipRange(userId: string, threadUserId: string) {
  const [seqs, deletions] = await Promise.all([
    prisma.membershipMessage.findMany({
      where: { threadUserId },
      distinct: ["threadSeq"],
      select: { threadSeq: true },
    }),
    listThreadDeletions(userId, "MEMBERSHIP", threadUserId),
  ]);
  const ranges = visibleInboxRanges(
    seqs.map((row) => row.threadSeq),
    deletions,
  );
  return ranges.at(-1) ?? null;
}

export async function currentVisibleDmRange(userId: string, otherUserId: string) {
  const [seqs, deletions] = await Promise.all([
    prisma.memberDirectMessage.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: userId },
        ],
      },
      distinct: ["threadSeq"],
      select: { threadSeq: true },
    }),
    listThreadDeletions(userId, "MEMBER_DM", otherUserId),
  ]);
  const ranges = visibleInboxRanges(
    seqs.map((row) => row.threadSeq),
    deletions,
  );
  return ranges.at(-1) ?? null;
}
