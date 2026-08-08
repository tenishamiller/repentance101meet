import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditMessage } from "@/lib/utils";
import { toggleReaction, type MessageReactions } from "@/lib/channel-messages";

type RouteParams = { params: Promise<{ slug: string; messageId: string }> };

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

const messageInclude = {
  user: { select: { id: true, name: true, avatarUrl: true } },
} as const;

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, messageId } = await params;
  const body = await request.json();

  const message = await prisma.channelMessage.findUnique({
    where: { id: messageId },
    include: { channel: true },
  });

  if (!message || message.channel.slug !== slug) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const channel = await canAccessChannel(slug, session.user.id, session.user.role);
  if (!channel) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  if (body.action === "restore" && session.user.role === "ADMIN") {
    const updated = await prisma.channelMessage.update({
      where: { id: messageId },
      data: { deletedAt: null },
      include: messageInclude,
    });
    return Response.json({ message: updated });
  }

  if (typeof body.reaction === "string" && body.reaction) {
    if (message.deletedAt) {
      return Response.json({ error: "Message hidden" }, { status: 400 });
    }

    const reactions = toggleReaction(
      message.reactions as MessageReactions | null,
      body.reaction,
      session.user.id,
    );

    const updated = await prisma.channelMessage.update({
      where: { id: messageId },
      data: { reactions },
      include: messageInclude,
    });

    return Response.json({ message: updated });
  }

  if (typeof body.content !== "string") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (message.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canEditMessage(message.createdAt)) {
    return Response.json({ error: "Edit window expired (5 minutes)" }, { status: 400 });
  }

  const updated = await prisma.channelMessage.update({
    where: { id: messageId },
    data: { content: body.content, updatedAt: new Date() },
    include: messageInclude,
  });

  return Response.json({ message: updated });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, messageId } = await params;

  const message = await prisma.channelMessage.findUnique({
    where: { id: messageId },
    include: { channel: true },
  });

  if (!message || message.channel.slug !== slug) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = message.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isAdmin) {
    const updated = await prisma.channelMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
      include: messageInclude,
    });
    return Response.json({ message: updated, hidden: true });
  }

  if (!canEditMessage(message.createdAt)) {
    return Response.json({ error: "Delete window expired (5 minutes)" }, { status: 400 });
  }

  await prisma.channelMessage.delete({
    where: { id: messageId },
  });

  return Response.json({ success: true });
}
