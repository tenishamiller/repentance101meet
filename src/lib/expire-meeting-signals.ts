import { prisma } from "@/lib/db";
import { meetingSignalCutoff } from "@/lib/meeting-participant-signals";

/** Clears raised hands and reactions older than one minute. */
export async function expireStaleMeetingSignals(meetingId: string) {
  const cutoff = meetingSignalCutoff();

  await prisma.meetingParticipant.updateMany({
    where: {
      meetingId,
      handRaised: true,
      OR: [{ handRaisedAt: null }, { handRaisedAt: { lt: cutoff } }],
    },
    data: { handRaised: false, handRaisedAt: null },
  });

  await prisma.meetingParticipant.updateMany({
    where: {
      meetingId,
      reaction: { not: null },
      OR: [{ reactionAt: null }, { reactionAt: { lt: cutoff } }],
    },
    data: { reaction: null, reactionAt: null },
  });
}
