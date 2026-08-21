import { NextRequest } from "next/server";
import { getActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expireStaleMeetingSignals } from "@/lib/expire-meeting-signals";
import { requireMeetingParticipant } from "@/lib/meeting-access";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const authz = await getActiveSession();
  if (authz.unauthorized) return authz.unauthorized;
  const session = authz.session;

  const { token } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting || meeting.deletedAt) {
    return Response.json({ error: "Meeting not found" }, { status: 404 });
  }

  const access = await requireMeetingParticipant({
    meetingId: meeting.id,
    userId: session.user.id,
    role: session.user.role,
    createdById: meeting.createdById,
  });
  if (!access.ok) {
    return Response.json({ error: "Join the meeting first" }, { status: 403 });
  }

  const isHost = meeting.createdById === session.user.id;
  if (isHost || session.user.role === "ADMIN") {
    await expireStaleMeetingSignals(meeting.id);
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
  const clapCount = participants.filter((p) => p.reaction === "CLAP").length;

  return Response.json({
    hostId: meeting.createdById,
    meetingStatus: meeting.status,
    memberVideoEnabled: meeting.memberVideoEnabled,
    memberMicEnabled: meeting.memberMicEnabled,
    participants,
    thumbsUp,
    thumbsDown,
    clapCount,
  });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const authz = await getActiveSession();
  if (authz.unauthorized) return authz.unauthorized;
  const session = authz.session;

  const { token } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting || meeting.deletedAt) {
    return Response.json({ error: "Meeting not found" }, { status: 404 });
  }

  if (meeting.status === "ENDED") {
    return Response.json({ success: true });
  }

  await prisma.meetingParticipant.deleteMany({
    where: { meetingId: meeting.id, userId: session.user.id },
  });

  return Response.json({ success: true });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authz = await getActiveSession();
  if (authz.unauthorized) return authz.unauthorized;
  const session = authz.session;

  const { token } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting || meeting.deletedAt) {
    return Response.json({ error: "Meeting not found" }, { status: 404 });
  }

  const isHost = meeting.createdById === session.user.id;
  if (!isHost && session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const targetUserId = typeof body.userId === "string" ? body.userId : null;
  if (!targetUserId || targetUserId === meeting.createdById) {
    return Response.json({ error: "Invalid userId" }, { status: 400 });
  }

  await prisma.meetingParticipant.deleteMany({
    where: { meetingId: meeting.id, userId: targetUserId },
  });

  return Response.json({ success: true });
}
