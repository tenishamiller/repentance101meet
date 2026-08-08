import { prisma } from "@/lib/db";
import type { MemberActivityType } from "@/generated/prisma/client";
import { formatRequestDateTime } from "@/lib/utils";

export type TimelineEvent = {
  id: string;
  type: MemberActivityType | "DERIVED";
  occurredAt: string;
  label: string;
  reason: string | null;
  editable?: boolean;
  logId?: string;
};

const CHANNEL_TYPE_LABEL: Record<string, string> = {
  PUBLIC: "public",
  PRIVATE: "private",
  GENERAL: "members",
};

function channelLabel(name: string, type: string) {
  const kind = CHANNEL_TYPE_LABEL[type] ?? type.toLowerCase();
  return `${name} (${kind} channel)`;
}

export async function buildMemberTimeline(userId: string): Promise<TimelineEvent[]> {
  const [user, logs, memberships, blocks, meetingParticipants] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.memberActivityLog.findMany({
      where: { userId },
      orderBy: { occurredAt: "asc" },
      include: {
        channel: { select: { name: true, type: true } },
        meeting: { select: { title: true } },
      },
    }),
    prisma.channelMembership.findMany({
      where: { userId },
      include: { channel: { select: { id: true, name: true, type: true } } },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.blockList.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.meetingParticipant.findMany({
      where: { userId, blocked: true },
      include: { meeting: { select: { id: true, title: true } } },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  if (!user) return [];

  const events: TimelineEvent[] = [];

  for (const log of logs) {
    events.push({
      id: log.id,
      logId: log.id,
      type: log.type,
      occurredAt: log.occurredAt.toISOString(),
      label:
        log.label ??
        (log.channel
          ? `${humanizeType(log.type)} — ${channelLabel(log.channel.name, log.channel.type)}`
          : log.meeting
            ? `${humanizeType(log.type)} — ${log.meeting.title}`
            : humanizeType(log.type)),
      reason: log.reason,
      editable: log.type === "CHANNEL_REMOVED" && !log.reason,
    });
  }

  const hasJoinedLog = logs.some((l) => l.type === "JOINED");
  if (!hasJoinedLog) {
    events.push({
      id: `derived-joined-${user.id}`,
      type: "DERIVED",
      occurredAt: user.createdAt.toISOString(),
      label: "Joined ministry",
      reason: null,
    });
  }

  for (const membership of memberships) {
    const ch = channelLabel(membership.channel.name, membership.channel.type);

    if (!logs.some((l) => l.type === "CHANNEL_REQUESTED" && l.channelId === membership.channelId)) {
      events.push({
        id: `derived-req-${membership.id}`,
        type: "DERIVED",
        occurredAt: membership.requestedAt.toISOString(),
        label: `Requested to join ${ch}`,
        reason: null,
      });
    }

    if (
      membership.status === "APPROVED" &&
      !logs.some((l) => l.type === "CHANNEL_APPROVED" && l.channelId === membership.channelId)
    ) {
      events.push({
        id: `derived-appr-${membership.id}`,
        type: "DERIVED",
        occurredAt: membership.updatedAt.toISOString(),
        label: `Approved for ${ch}`,
        reason: null,
      });
    }
    if (
      membership.status === "DENIED" &&
      !logs.some((l) => l.type === "CHANNEL_DENIED" && l.channelId === membership.channelId)
    ) {
      events.push({
        id: `derived-den-${membership.id}`,
        type: "DERIVED",
        occurredAt: membership.updatedAt.toISOString(),
        label: `Denied for ${ch}`,
        reason: null,
      });
    }
    if (
      membership.status === "REMOVED" &&
      !logs.some((l) => l.type === "CHANNEL_REMOVED" && l.channelId === membership.channelId)
    ) {
      events.push({
        id: `derived-rem-${membership.id}`,
        type: "DERIVED",
        occurredAt: membership.updatedAt.toISOString(),
        label: `Removed from ${ch}`,
        reason: null,
        editable: true,
      });
    }
  }

  for (const block of blocks) {
    if (!logs.some((l) => l.type === "BLOCKED" && Math.abs(l.occurredAt.getTime() - block.createdAt.getTime()) < 60000)) {
      events.push({
        id: `derived-block-${block.id}`,
        type: "DERIVED",
        occurredAt: block.createdAt.toISOString(),
        label: "Blocked from ministry meetings",
        reason: block.reason,
      });
    }
    if (
      block.unblockedAt &&
      !logs.some((l) => l.type === "UNBLOCKED" && Math.abs(l.occurredAt.getTime() - block.unblockedAt!.getTime()) < 60000)
    ) {
      events.push({
        id: `derived-unblock-${block.id}`,
        type: "DERIVED",
        occurredAt: block.unblockedAt.toISOString(),
        label: "Unblocked from ministry meetings",
        reason: null,
      });
    }
  }

  for (const participant of meetingParticipants) {
    if (!logs.some((l) => l.type === "BLOCKED_MEETING" && l.meetingId === participant.meetingId)) {
      events.push({
        id: `derived-mblock-${participant.id}`,
        type: "DERIVED",
        occurredAt: participant.joinedAt.toISOString(),
        label: `Removed from live meeting: ${participant.meeting.title}`,
        reason: null,
      });
    }
  }

  events.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  return events.map((event) => ({
    ...event,
    occurredAt: formatRequestDateTime(event.occurredAt),
  }));
}

function humanizeType(type: MemberActivityType): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
