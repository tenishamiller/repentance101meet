import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { expireStaleMeetingSignals } from "@/lib/expire-meeting-signals";

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

  await expireStaleMeetingSignals(meeting.id);

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

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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
