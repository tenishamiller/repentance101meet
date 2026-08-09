import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditMessage } from "@/lib/utils";

type RouteParams = { params: Promise<{ token: string; messageId: string }> };

async function canModerateMeetingChat(
  meeting: { id: string; createdById: string },
  userId: string,
  role: string,
) {
  return role === "ADMIN" || meeting.createdById === userId;
}

const messageInclude = {
  user: { select: { id: true, name: true, avatarUrl: true } },
} as const;

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, messageId } = await params;
  const body = await request.json();

  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting || meeting.deletedAt) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const message = await prisma.meetingMessage.findUnique({ where: { id: messageId } });
  if (!message || message.meetingId !== meeting.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (body.action === "restore") {
    if (!(await canModerateMeetingChat(meeting, session.user.id, session.user.role))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.meetingMessage.update({
      where: { id: messageId },
      data: { deletedAt: null },
      include: messageInclude,
    });
    return Response.json({ message: updated });
  }

  if (typeof body.content === "string") {
    if (message.userId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!canEditMessage(message.createdAt)) {
      return Response.json({ error: "Edit window expired (5 minutes)" }, { status: 400 });
    }

    const content = body.content.trim();
    const attachments = message.attachments as unknown[] | null;
    if (!content && (!attachments || attachments.length === 0)) {
      return Response.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    const updated = await prisma.meetingMessage.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: messageInclude,
    });
    return Response.json({ message: updated });
  }

  return Response.json({ error: "Invalid request" }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, messageId } = await params;

  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting || meeting.deletedAt) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const message = await prisma.meetingMessage.findUnique({ where: { id: messageId } });
  if (!message || message.meetingId !== meeting.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = message.userId === session.user.id;
  const isModerator = await canModerateMeetingChat(
    meeting,
    session.user.id,
    session.user.role,
  );

  if (isOwner && canEditMessage(message.createdAt)) {
    await prisma.meetingMessage.delete({ where: { id: messageId } });
    return Response.json({ success: true, deleted: true });
  }

  if (isModerator && !isOwner) {
    const updated = await prisma.meetingMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
      include: messageInclude,
    });
    return Response.json({ message: updated, hidden: true });
  }

  return Response.json({ error: "Forbidden" }, { status: 403 });
}
