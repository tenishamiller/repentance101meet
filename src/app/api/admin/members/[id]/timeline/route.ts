import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildMemberTimeline } from "@/lib/member-timeline";
import { logMemberActivity } from "@/lib/member-activity";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      status: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  const timeline = await buildMemberTimeline(id);

  return Response.json({ user, timeline });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { logId, reason, membershipId } = await request.json();

  if (logId && reason) {
    await prisma.memberActivityLog.update({
      where: { id: logId },
      data: { reason: String(reason) },
    });
    return Response.json({ success: true });
  }

  if (membershipId && reason) {
    const membership = await prisma.channelMembership.findUnique({
      where: { id: membershipId },
      include: { channel: { select: { name: true, type: true } } },
    });
    if (!membership || membership.userId !== id) {
      return Response.json({ error: "Membership not found" }, { status: 404 });
    }

    await logMemberActivity({
      userId: id,
      type: "CHANNEL_REMOVED",
      channelId: membership.channelId,
      reason: String(reason),
      actorId: session.user.id,
      label: `Removed from ${membership.channel.name}`,
    });

    return Response.json({ success: true });
  }

  return Response.json({ error: "Invalid request" }, { status: 400 });
}
