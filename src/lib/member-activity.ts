import { prisma } from "@/lib/db";
import type { MemberActivityType } from "@/generated/prisma/client";

type LogInput = {
  userId: string;
  type: MemberActivityType;
  occurredAt?: Date;
  channelId?: string | null;
  meetingId?: string | null;
  reason?: string | null;
  actorId?: string | null;
  label?: string | null;
};

export async function logMemberActivity(input: LogInput) {
  await prisma.memberActivityLog.create({
    data: {
      userId: input.userId,
      type: input.type,
      occurredAt: input.occurredAt ?? new Date(),
      channelId: input.channelId ?? undefined,
      meetingId: input.meetingId ?? undefined,
      reason: input.reason ?? undefined,
      actorId: input.actorId ?? undefined,
      label: input.label ?? undefined,
    },
  });
}
