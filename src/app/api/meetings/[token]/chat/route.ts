import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ token: string }> };

async function canModerateMeetingChat(
  meeting: { id: string; createdById: string },
  userId: string,
  role: string,
) {
  return role === "ADMIN" || meeting.createdById === userId;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting || meeting.deletedAt) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const canModerate = await canModerateMeetingChat(
    meeting,
    session.user.id,
    session.user.role,
  );

  const messages = await prisma.meetingMessage.findMany({
    where: {
      meetingId: meeting.id,
      ...(canModerate ? {} : { deletedAt: null }),
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return Response.json({ messages, canModerate });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting || meeting.status !== "LIVE") {
    return Response.json({ error: "Meeting not active" }, { status: 403 });
  }

  const participant = await prisma.meetingParticipant.findUnique({
    where: {
      meetingId_userId: { meetingId: meeting.id, userId: session.user.id },
    },
  });

  if (participant?.blocked || !participant) {
    return Response.json({ error: "Join the meeting to chat" }, { status: 403 });
  }

  const { content, attachments } = await request.json();

  if (!content?.trim() && !attachments?.length) {
    return Response.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const message = await prisma.meetingMessage.create({
    data: {
      meetingId: meeting.id,
      userId: session.user.id,
      content: content ?? "",
      attachments: attachments ?? undefined,
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return Response.json({ message });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const { userId, action, enabled } = await request.json();

  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting || meeting.deletedAt) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "raise-hand" || action === "lower-hand") {
    const now = new Date();
    await prisma.meetingParticipant.update({
      where: { meetingId_userId: { meetingId: meeting.id, userId: session.user.id } },
      data:
        action === "raise-hand"
          ? { handRaised: true, handRaisedAt: now }
          : { handRaised: false, handRaisedAt: null },
    });
    return Response.json({ success: true });
  }

  if (action === "react-up" || action === "react-down" || action === "react-clear") {
    const participant = await prisma.meetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId: meeting.id, userId: session.user.id } },
    });

    if (!participant || participant.blocked) {
      return Response.json({ error: "Not in meeting" }, { status: 403 });
    }

    let reaction: string | null = null;
    let reactionAt: Date | null = null;
    if (action === "react-up") {
      reaction = participant.reaction === "UP" ? null : "UP";
      reactionAt = reaction ? new Date() : null;
    } else if (action === "react-down") {
      reaction = participant.reaction === "DOWN" ? null : "DOWN";
      reactionAt = reaction ? new Date() : null;
    }

    await prisma.meetingParticipant.update({
      where: { meetingId_userId: { meetingId: meeting.id, userId: session.user.id } },
      data: { reaction, reactionAt },
    });

    return Response.json({ success: true, reaction });
  }

  if (session.user.role !== "ADMIN" && meeting.createdById !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "set-member-video" || action === "set-member-mic") {
    const allowed = enabled !== false;
    await prisma.meeting.update({
      where: { id: meeting.id },
      data:
        action === "set-member-video"
          ? { memberVideoEnabled: allowed }
          : { memberMicEnabled: allowed },
    });
    await prisma.meetingSignal.create({
      data: {
        meetingId: meeting.id,
        fromUserId: session.user.id,
        toUserId: null,
        type: action === "set-member-video" ? "member-video-policy" : "member-mic-policy",
        payload: { enabled: allowed },
      },
    });
    return Response.json({
      success: true,
      memberVideoEnabled: action === "set-member-video" ? allowed : meeting.memberVideoEnabled,
      memberMicEnabled: action === "set-member-mic" ? allowed : meeting.memberMicEnabled,
    });
  }

  if (action === "remove") {
    if (!userId || typeof userId !== "string") {
      return Response.json({ error: "userId required" }, { status: 400 });
    }
    if (userId === meeting.createdById) {
      return Response.json({ error: "Cannot remove the host" }, { status: 400 });
    }

    await prisma.meetingParticipant.deleteMany({
      where: { meetingId: meeting.id, userId },
    });
    await prisma.meetingSignal.create({
      data: {
        meetingId: meeting.id,
        fromUserId: session.user.id,
        toUserId: userId,
        type: "kick",
        payload: { reason: "removed" },
      },
    });
    return Response.json({ success: true });
  }

  if (action === "block") {
    await prisma.meetingParticipant.update({
      where: { meetingId_userId: { meetingId: meeting.id, userId } },
      data: { blocked: true },
    });
    await prisma.blockList.upsert({
      where: {
        userId_blockedById: { userId, blockedById: session.user.id },
      },
      update: { unblockedAt: null },
      create: { userId, blockedById: session.user.id, reason: "Blocked during meeting" },
    });
    await prisma.meetingSignal.create({
      data: {
        meetingId: meeting.id,
        fromUserId: session.user.id,
        toUserId: userId,
        type: "kick",
        payload: {},
      },
    });
    return Response.json({ success: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
