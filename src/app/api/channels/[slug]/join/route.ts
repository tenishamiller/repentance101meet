import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logMemberActivity } from "@/lib/member-activity";

type RouteParams = { params: Promise<{ slug: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.status !== "APPROVED" && session.user.role !== "ADMIN") {
    return Response.json({ error: "Account not approved" }, { status: 403 });
  }

  const { slug } = await params;
  const channel = await prisma.channel.findUnique({ where: { slug } });
  if (!channel || channel.type === "PUBLIC") {
    return Response.json({ error: "Channel not found" }, { status: 404 });
  }

  const membership = await prisma.channelMembership.upsert({
    where: {
      userId_channelId: {
        userId: session.user.id,
        channelId: channel.id,
      },
    },
    update: { status: "PENDING", requestedAt: new Date() },
    create: {
      userId: session.user.id,
      channelId: channel.id,
      status: "PENDING",
      requestedAt: new Date(),
    },
  });

  await logMemberActivity({
    userId: session.user.id,
    type: "CHANNEL_REQUESTED",
    channelId: channel.id,
    label: `Requested to join ${channel.name}`,
  });

  return Response.json({
    membership: {
      ...membership,
      requestedAt: membership.requestedAt.toISOString(),
    },
  });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "ADMIN") {
    return Response.json({ error: "Hosts stay in every channel" }, { status: 400 });
  }

  const { slug } = await params;
  const channel = await prisma.channel.findUnique({ where: { slug } });
  if (!channel || channel.type === "PUBLIC") {
    return Response.json({ error: "Channel not found" }, { status: 404 });
  }

  const membership = await prisma.channelMembership.findUnique({
    where: {
      userId_channelId: {
        userId: session.user.id,
        channelId: channel.id,
      },
    },
  });

  if (!membership || membership.status !== "APPROVED") {
    return Response.json({ error: "You are not in this channel" }, { status: 403 });
  }

  await prisma.channelMembership.delete({ where: { id: membership.id } });

  await logMemberActivity({
    userId: session.user.id,
    type: "CHANNEL_REMOVED",
    channelId: channel.id,
    actorId: session.user.id,
    label: `Left ${channel.name}`,
  });

  return Response.json({ success: true });
}

