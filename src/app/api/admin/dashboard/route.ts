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
    activeBlocks,
    liveMeetings,
    recentMeetings,
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
    prisma.blockList.findMany({
      where: { unblockedAt: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.meeting.findMany({ where: { status: "LIVE" } }),
    prisma.meeting.findMany({
      where: { status: "ENDED" },
      orderBy: { endedAt: "desc" },
      take: 10,
    }),
  ]);

  return Response.json({
    pendingMembers,
    pendingChannelRequests,
    activeBlocks,
    liveMeetings,
    recentMeetings,
  });
}
