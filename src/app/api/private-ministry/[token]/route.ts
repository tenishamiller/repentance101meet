import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const privateSession = await prisma.meeting.findFirst({
    where: { linkToken: token, kind: "PRIVATE" },
    include: {
      invitedUser: { select: { id: true, name: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  if (!privateSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  if (
    session.user.status !== "APPROVED" &&
    session.user.role !== "ADMIN" &&
    !privateSession.isOnboardingApproval
  ) {
    return Response.json({ error: "Account not approved" }, { status: 403 });
  }

  if (
    privateSession.isOnboardingApproval &&
    session.user.status === "PENDING" &&
    session.user.id !== privateSession.invitedUserId
  ) {
    return Response.json({ error: "This onboarding session is not for you" }, { status: 403 });
  }

  const isHost = session.user.id === privateSession.createdById;
  const isInvitee = session.user.id === privateSession.invitedUserId;

  if (!isHost && !isInvitee) {
    return Response.json(
      { error: "This is a private session — only the invited member may join" },
      { status: 403 },
    );
  }

  if (privateSession.status === "ENDED") {
    return Response.json({ error: "This session has ended" }, { status: 403 });
  }

  // Host entering the room starts the session (same as livestream),
  // so members are not stuck waiting while the host is already inside.
  if (isHost && privateSession.status === "SCHEDULED") {
    await prisma.meeting.update({
      where: { id: privateSession.id },
      data: { status: "LIVE", startedAt: new Date() },
    });
    privateSession.status = "LIVE";
  }

  if (privateSession.status !== "LIVE" && !isHost) {
    return Response.json(
      {
        error: "The host has not started this session yet — check back soon",
        code: "HOST_NOT_STARTED",
      },
      { status: 403 },
    );
  }

  const block = await prisma.blockList.findFirst({
    where: { userId: session.user.id, unblockedAt: null },
  });

  if (block) {
    return Response.json({ error: "You are blocked from meetings" }, { status: 403 });
  }

  if (!session.user.name) {
    return Response.json({ error: "Complete your profile first" }, { status: 400 });
  }

  await prisma.meetingParticipant.upsert({
    where: {
      meetingId_userId: { meetingId: privateSession.id, userId: session.user.id },
    },
    update: { blocked: false },
    create: { meetingId: privateSession.id, userId: session.user.id },
  });

  const peer =
    isHost && privateSession.invitedUser
      ? privateSession.invitedUser
      : privateSession.createdBy;

  return Response.json({
    session: {
      id: privateSession.id,
      title: privateSession.title,
      status: privateSession.status,
      createdById: privateSession.createdById,
      invitedUserId: privateSession.invitedUserId,
      isOnboardingApproval: privateSession.isOnboardingApproval,
    },
    isHost,
    peer,
    user: {
      id: session.user.id,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
    },
  });
}
