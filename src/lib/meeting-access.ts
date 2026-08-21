import { prisma } from "@/lib/db";

export async function requireMeetingParticipant(options: {
  meetingId: string;
  userId: string;
  role: string;
  createdById: string;
  allowHostWithoutJoin?: boolean;
}) {
  const { meetingId, userId, role, createdById, allowHostWithoutJoin = true } = options;
  if (role === "ADMIN") return { ok: true as const };
  if (allowHostWithoutJoin && createdById === userId) return { ok: true as const };

  const participant = await prisma.meetingParticipant.findUnique({
    where: { meetingId_userId: { meetingId, userId } },
    select: { blocked: true },
  });

  if (!participant || participant.blocked) {
    return { ok: false as const };
  }

  return { ok: true as const };
}
