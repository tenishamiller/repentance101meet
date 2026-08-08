import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  let meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });

  if (!meeting || meeting.deletedAt) {
    return Response.json({ error: "Meeting not found" }, { status: 404 });
  }

  if (meeting.kind === "PRIVATE") {
    return Response.json(
      { error: "This is a private ministry session — use Personal Ministry to join" },
      { status: 403 },
    );
  }

  if (session.user.status !== "APPROVED" && session.user.role !== "ADMIN") {
    return Response.json({ error: "Account not approved" }, { status: 403 });
  }

  const block = await prisma.blockList.findFirst({
    where: { userId: session.user.id, unblockedAt: null },
  });

  if (block) {
    return Response.json({ error: "You are blocked from meetings" }, { status: 403 });
  }

  const isHost = session.user.id === meeting.createdById;

  if (isHost && meeting.status === "SCHEDULED") {
    meeting = await prisma.meeting.update({
      where: { id: meeting.id },
      data: { status: "LIVE", startedAt: new Date() },
    });
  }

  if (meeting.status !== "LIVE" && session.user.role !== "ADMIN") {
    if (meeting.status === "ENDED") {
      return Response.json(
        {
          error: "This meeting has ended",
          code: "MEETING_ENDED",
          meeting: { title: meeting.title, status: meeting.status },
        },
        { status: 410 },
      );
    }
    return Response.json({ error: "Meeting is not live yet" }, { status: 403 });
  }

  if (!session.user.name) {
    return Response.json({ error: "Complete your profile first" }, { status: 400 });
  }

  await prisma.meetingParticipant.upsert({
    where: {
      meetingId_userId: { meetingId: meeting.id, userId: session.user.id },
    },
    update: { blocked: false },
    create: { meetingId: meeting.id, userId: session.user.id },
  });

  return Response.json({
    meeting: {
      id: meeting.id,
      title: meeting.title,
      status: meeting.status,
      createdById: meeting.createdById,
    },
    isHost,
    user: {
      id: session.user.id,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
    },
  });
}
