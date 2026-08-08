import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

export async function PATCH(request: Request, { params }: RouteParams) {
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

  if (!(await canModerateMeetingChat(meeting, session.user.id, session.user.role))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const message = await prisma.meetingMessage.findUnique({ where: { id: messageId } });
  if (!message || message.meetingId !== meeting.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (body.action === "restore") {
    const updated = await prisma.meetingMessage.update({
      where: { id: messageId },
      data: { deletedAt: null },
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

  if (!(await canModerateMeetingChat(meeting, session.user.id, session.user.role))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const message = await prisma.meetingMessage.findUnique({ where: { id: messageId } });
  if (!message || message.meetingId !== meeting.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.meetingMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
    include: messageInclude,
  });

  return Response.json({ message: updated, hidden: true });
}
