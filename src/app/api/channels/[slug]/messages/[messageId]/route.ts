import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditMessage } from "@/lib/utils";

type RouteParams = { params: Promise<{ slug: string; messageId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, messageId } = await params;
  const { content } = await request.json();

  const message = await prisma.channelMessage.findUnique({
    where: { id: messageId },
    include: { channel: true },
  });

  if (!message || message.channel.slug !== slug) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (message.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canEditMessage(message.createdAt)) {
    return Response.json({ error: "Edit window expired (5 minutes)" }, { status: 400 });
  }

  const updated = await prisma.channelMessage.update({
    where: { id: messageId },
    data: { content, updatedAt: new Date() },
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

  if (isOwner && !canEditMessage(message.createdAt)) {
    return Response.json({ error: "Delete window expired (5 minutes)" }, { status: 400 });
  }

  await prisma.channelMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date(), content: "" },
  });

  return Response.json({ success: true });
}
