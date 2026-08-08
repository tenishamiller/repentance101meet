import { prisma } from "@/lib/db";

/** Remove stale kick signals so unblocked members can rejoin without being kicked again. */
export async function clearKickSignalsForUser(
  userId: string,
  meetingId?: string,
) {
  await prisma.meetingSignal.deleteMany({
    where: {
      toUserId: userId,
      type: "kick",
      ...(meetingId ? { meetingId } : {}),
    },
  });
}

export async function unblockMeetingParticipant(
  meetingId: string,
  userId: string,
) {
  await prisma.meetingParticipant.updateMany({
    where: { meetingId, userId },
    data: { blocked: false },
  });
  await clearKickSignalsForUser(userId, meetingId);
}

export async function unblockMemberMeetings(userId: string) {
  await prisma.meetingParticipant.updateMany({
    where: { userId },
    data: { blocked: false },
  });
  await clearKickSignalsForUser(userId);
}
