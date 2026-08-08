import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditMessage } from "@/lib/utils";
import { toggleReaction, type MessageReactions } from "@/lib/channel-messages";

type RouteParams = { params: Promise<{ slug: string }> };

async function canAccessChannel(slug: string, userId: string, role: string) {
  const channel = await prisma.channel.findUnique({ where: { slug } });
  if (!channel) return null;

  if (channel.type === "PUBLIC") return channel;
  if (role === "ADMIN") return channel;

  const membership = await prisma.channelMembership.findUnique({
    where: { userId_channelId: { userId, channelId: channel.id } },
  });

  if (membership?.status !== "APPROVED") return null;
  return channel;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const channel = await canAccessChannel(slug, session.user.id, session.user.role);

  if (!channel) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  const messages = await prisma.channelMessage.findMany({
    where: { channelId: channel.id },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
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

  const { slug } = await params;
  const channel = await canAccessChannel(slug, session.user.id, session.user.role);

  if (!channel) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  const { content, attachments } = await request.json();

  const message = await prisma.channelMessage.create({
    data: {
      channelId: channel.id,
      userId: session.user.id,
      content: content ?? "",
      attachments: attachments ?? undefined,
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return Response.json({ message });
}
