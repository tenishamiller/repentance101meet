import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditMessage } from "@/lib/utils";
import { toggleReaction, type MessageReactions } from "@/lib/channel-messages";

type RouteParams = { params: Promise<{ slug: string }> };

async function canAccessChannel(slug: string, userId: string, role: string) {
  const channel = await prisma.channel.findUnique({ where: { slug } });
  if (!channel) return { channel: null, membershipStatus: null as string | null };

  if (channel.type === "PUBLIC") return { channel, membershipStatus: "APPROVED" };
  if (role === "ADMIN") return { channel, membershipStatus: "APPROVED" };

  const membership = await prisma.channelMembership.findUnique({
    where: { userId_channelId: { userId, channelId: channel.id } },
  });

  if (membership?.status !== "APPROVED") {
    return { channel: null, membershipStatus: membership?.status ?? null };
  }
  return { channel, membershipStatus: "APPROVED" };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const { channel, membershipStatus } = await canAccessChannel(
    slug,
    session.user.id,
    session.user.role,
  );

  if (!channel) {
    return Response.json(
      { error: "Access denied", membershipStatus },
      { status: 403 },
    );
  }

  const isAdmin = session.user.role === "ADMIN";

  const messages = await prisma.channelMessage.findMany({
    where: {
      channelId: channel.id,
      ...(isAdmin ? {} : { deletedAt: null }),
    },
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
  const { channel } = await canAccessChannel(slug, session.user.id, session.user.role);

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
