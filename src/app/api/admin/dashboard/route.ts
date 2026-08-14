import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activeMeetingFilter, purgeExpiredMeetings, visibleMeetingFilter } from "@/lib/meeting-deletion";
import { activeUserFilter, purgeExpiredUsers } from "@/lib/user-deletion";
import { purgeExpiredMessageThreads } from "@/lib/message-thread-deletion";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await purgeExpiredMeetings();
  await purgeExpiredUsers();
  await purgeExpiredMessageThreads();

  const meetingVisibility = activeMeetingFilter();
  const memberVisibility = activeUserFilter();

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
      where: { status: "PENDING", role: "MEMBER", ...memberVisibility },
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
      where: { status: "LIVE", ...meetingVisibility },
      include: {
        invitedUser: { select: { id: true, name: true } },
      },
    }),
    prisma.meeting.findMany({
      where: { status: "ENDED", kind: "LIVESTREAM", ...meetingVisibility },
      orderBy: { endedAt: "desc" },
      take: 10,
    }),
    prisma.user.count({ where: { role: "MEMBER", status: "APPROVED", ...memberVisibility } }),
    prisma.user.count({ where: { role: "MEMBER", ...memberVisibility } }),
    prisma.meeting.findMany({
      where: { status: "LIVE", kind: "PRIVATE", ...meetingVisibility },
      include: {
        invitedUser: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.meeting.findMany({
      where: { recordingUrl: { not: null }, kind: "LIVESTREAM", ...visibleMeetingFilter() },
      orderBy: { endedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        recordingUrl: true,
        endedAt: true,
        createdAt: true,
        deletedAt: true,
        purgeAt: true,
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
