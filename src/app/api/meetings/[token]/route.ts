import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createMeetingToken } from "@/lib/livekit";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });

  if (!meeting) {
    return Response.json({ error: "Meeting not found" }, { status: 404 });
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

  if (meeting.status !== "LIVE" && session.user.role !== "ADMIN") {
    return Response.json({ error: "Meeting is not live yet" }, { status: 403 });
  }

  if (!session.user.name) {
    return Response.json({ error: "Complete your profile first" }, { status: 400 });
  }

  const isAdmin = session.user.role === "ADMIN";

  await prisma.meetingParticipant.upsert({
    where: {
      meetingId_userId: { meetingId: meeting.id, userId: session.user.id },
    },
    update: { blocked: false },
    create: { meetingId: meeting.id, userId: session.user.id },
  });

  const livekitToken = await createMeetingToken(
    meeting.livekitRoom!,
    session.user.name,
    session.user.id,
    isAdmin,
  );

  return Response.json({
    meeting,
    token: livekitToken,
    livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    isAdmin,
    user: {
      id: session.user.id,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
    },
  });
}
