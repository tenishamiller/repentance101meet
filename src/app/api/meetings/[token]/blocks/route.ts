import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ token: string }> };

async function getMeetingContext(token: string, userId: string, role: string) {
  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting || meeting.deletedAt) {
    return { error: "Meeting not found", status: 404 as const };
  }

  const isHost = meeting.createdById === userId;
  const isAdmin = role === "ADMIN";
  if (!isHost && !isAdmin) {
    return { error: "Forbidden", status: 403 as const };
  }

  return { meeting, isHost, isAdmin };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const ctx = await getMeetingContext(token, session.user.id, session.user.role);
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const { meeting, isAdmin } = ctx;

  const blockWhere = isAdmin
    ? { unblockedAt: null }
    : { unblockedAt: null, blockedById: session.user.id };

  const [globalBlocks, meetingBlocked] = await Promise.all([
    prisma.blockList.findMany({
      where: blockWhere,
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.meetingParticipant.findMany({
      where: { meetingId: meeting.id, blocked: true },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    }),
  ]);

  const byUserId = new Map<
    string,
    {
      user: { id: string; name: string; email: string; avatarUrl: string | null };
      blockId: string | null;
      blockedInMeeting: boolean;
    }
  >();

  for (const block of globalBlocks) {
    byUserId.set(block.user.id, {
      user: block.user,
      blockId: block.id,
      blockedInMeeting: false,
    });
  }

  for (const participant of meetingBlocked) {
    const existing = byUserId.get(participant.user.id);
    if (existing) {
      existing.blockedInMeeting = true;
    } else {
      byUserId.set(participant.user.id, {
        user: participant.user,
        blockId: null,
        blockedInMeeting: true,
      });
    }
  }

  return Response.json({
    blocked: Array.from(byUserId.values()),
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const ctx = await getMeetingContext(token, session.user.id, session.user.role);
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const { meeting, isAdmin } = ctx;
  const { userId, blockId } = await request.json();

  if (!userId && !blockId) {
    return Response.json({ error: "userId or blockId required" }, { status: 400 });
  }

  if (blockId) {
    const block = await prisma.blockList.findUnique({ where: { id: blockId } });
    if (!block) {
      return Response.json({ error: "Block not found" }, { status: 404 });
    }
    if (!isAdmin && block.blockedById !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.blockList.update({
      where: { id: blockId },
      data: { unblockedAt: new Date() },
    });
    await prisma.meetingParticipant.updateMany({
      where: { userId: block.userId },
      data: { blocked: false },
    });
    return Response.json({ success: true });
  }

  const blocks = await prisma.blockList.findMany({
    where: {
      userId,
      unblockedAt: null,
      ...(isAdmin ? {} : { blockedById: session.user.id }),
    },
  });

  if (blocks.length > 0) {
    await prisma.blockList.updateMany({
      where: { id: { in: blocks.map((b) => b.id) } },
      data: { unblockedAt: new Date() },
    });
  }

  await prisma.meetingParticipant.updateMany({
    where: { meetingId: meeting.id, userId },
    data: { blocked: false },
  });

  return Response.json({ success: true });
}
