import { NextRequest } from "next/server";
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
  if (!meeting) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await prisma.meetingMessage.findMany({
    where: { meetingId: meeting.id },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return Response.json({ messages });
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

  if (participant?.blocked) {
    return Response.json({ error: "You are blocked from this meeting" }, { status: 403 });
  }

  const { content, attachments } = await request.json();

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
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { token } = await params;
  const { userId, action } = await request.json();

  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting) {
    return Response.json({ error: "Not found" }, { status: 404 });
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
  }

  if (action === "raise-hand") {
    await prisma.meetingParticipant.update({
      where: { meetingId_userId: { meetingId: meeting.id, userId: session.user.id } },
      data: { handRaised: true },
    });
  }

  if (action === "lower-hand") {
    await prisma.meetingParticipant.update({
      where: { meetingId_userId: { meetingId: meeting.id, userId: session.user.id } },
      data: { handRaised: false },
    });
  }

  return Response.json({ success: true });
}
