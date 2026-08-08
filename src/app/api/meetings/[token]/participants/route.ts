import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting || meeting.deletedAt) {
    return Response.json({ error: "Meeting not found" }, { status: 404 });
  }

  const participants = await prisma.meetingParticipant.findMany({
    where: { meetingId: meeting.id, blocked: false },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  const thumbsUp = participants.filter((p) => p.reaction === "UP").length;
  const thumbsDown = participants.filter((p) => p.reaction === "DOWN").length;

  return Response.json({
    hostId: meeting.createdById,
    meetingStatus: meeting.status,
    memberVideoEnabled: meeting.memberVideoEnabled,
    memberMicEnabled: meeting.memberMicEnabled,
    participants,
    thumbsUp,
    thumbsDown,
  });
}
