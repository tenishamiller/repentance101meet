import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { removeParticipant } from "@/lib/livekit";

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

  const { userId, reason, meetingId } = await request.json();

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
    if (meeting?.livekitRoom) {
      try {
        await removeParticipant(meeting.livekitRoom, userId);
      } catch {
        /* participant may not be in room */
      }
    }
    await prisma.meetingParticipant.updateMany({
      where: { meetingId, userId },
      data: { blocked: true },
    });
  }

  return Response.json({ block });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { blockId } = await request.json();

  await prisma.blockList.update({
    where: { id: blockId },
    data: { unblockedAt: new Date() },
  });

  return Response.json({ success: true });
}
