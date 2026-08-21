import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logMemberActivity } from "@/lib/member-activity";
import { unblockMemberMeetings } from "@/lib/meeting-blocks";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocks = await prisma.blockList.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      blockedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ blocks });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { userId, reason, meetingId } = body as {
    userId?: string;
    reason?: string;
    meetingId?: string;
  };
  if (!userId) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }

  const block = await prisma.blockList.upsert({
    where: {
      userId_blockedById: {
        userId,
        blockedById: session.user.id,
      },
    },
    update: { unblockedAt: null, reason },
    create: {
      userId,
      blockedById: session.user.id,
      reason,
    },
  });

  if (meetingId) {
    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (meeting) {
      await prisma.meetingSignal.create({
        data: {
          meetingId: meeting.id,
          fromUserId: session.user.id,
          toUserId: userId,
          type: "kick",
          payload: {},
        },
      });
    }
    await prisma.meetingParticipant.updateMany({
      where: { meetingId, userId },
      data: { blocked: true },
    });
  }

  await logMemberActivity({
    userId,
    type: meetingId ? "BLOCKED_MEETING" : "BLOCKED",
    meetingId: meetingId ?? undefined,
    reason: reason ?? undefined,
    actorId: session.user.id,
    label: meetingId ? "Blocked from live meeting" : "Blocked from ministry meetings",
  });

  return Response.json({ block });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { blockId } = body as { blockId?: string };
  if (!blockId) {
    return Response.json({ error: "blockId required" }, { status: 400 });
  }

  const existing = await prisma.blockList.findUnique({ where: { id: blockId } });
  if (!existing) {
    return Response.json({ error: "Block not found" }, { status: 404 });
  }

  await prisma.blockList.update({
    where: { id: blockId },
    data: { unblockedAt: new Date() },
  });

  const block = await prisma.blockList.findUnique({ where: { id: blockId } });
  if (block) {
    await logMemberActivity({
      userId: block.userId,
      type: "UNBLOCKED",
      actorId: session.user.id,
      label: "Unblocked from ministry meetings",
    });

    await unblockMemberMeetings(block.userId);
  }

  return Response.json({ success: true });
}
