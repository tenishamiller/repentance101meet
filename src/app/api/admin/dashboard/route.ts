import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    pendingMembers,
    pendingChannelRequests,
    deniedChannelRequests,
    activeBlocks,
    liveMeetings,
    recentMeetings,
    approvedMemberCount,
    totalMemberCount,
    livePrivateSessions,
    recordings,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { status: "PENDING", role: "MEMBER" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.channelMembership.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        channel: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.channelMembership.findMany({
      where: { status: "DENIED" },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        channel: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.blockList.findMany({
      where: { unblockedAt: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.meeting.findMany({
      where: { status: "LIVE" },
      include: {
        invitedUser: { select: { id: true, name: true } },
      },
    }),
    prisma.meeting.findMany({
      where: { status: "ENDED", kind: "LIVESTREAM" },
      orderBy: { endedAt: "desc" },
      take: 10,
    }),
    prisma.user.count({ where: { role: "MEMBER", status: "APPROVED" } }),
    prisma.user.count({ where: { role: "MEMBER" } }),
    prisma.meeting.findMany({
      where: { status: "LIVE", kind: "PRIVATE" },
      include: {
        invitedUser: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.meeting.findMany({
      where: { recordingUrl: { not: null }, kind: "LIVESTREAM" },
      orderBy: { endedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        recordingUrl: true,
        endedAt: true,
        createdAt: true,
      },
    }),
  ]);

  return Response.json({
    pendingMembers,
    pendingChannelRequests: pendingChannelRequests.map((req) => ({
      id: req.id,
      requestedAt: req.requestedAt.toISOString(),
      user: req.user,
      channel: req.channel,
    })),
    deniedChannelRequests: deniedChannelRequests.map((req) => ({
      id: req.id,
      requestedAt: req.requestedAt.toISOString(),
      user: req.user,
      channel: req.channel,
    })),
    activeBlocks,
    liveMeetings,
    recentMeetings,
    approvedMemberCount,
    totalMemberCount,
    livePrivateSessions,
    recordings,
  });
}
