import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canEditMessage } from "@/lib/utils";
import { z } from "zod";

const messageInclude = {
  sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
  meeting: {
    select: {
      id: true,
      linkToken: true,
      title: true,
      status: true,
      isOnboardingApproval: true,
    },
  },
} as const;

type RouteParams = { params: Promise<{ messageId: string }> };

async function canAccessMessage(
  message: { threadUserId: string; senderId: string; type: string },
  userId: string,
  role: string,
) {
  if (role === "ADMIN") return true;
  return message.threadUserId === userId || message.senderId === userId;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await params;
  const body = z.object({ content: z.string().trim().min(1).max(2000) }).parse(await request.json());

  const message = await prisma.membershipMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (message.type !== "TEXT") {
    return Response.json({ error: "This message cannot be edited" }, { status: 400 });
  }

  if (!(await canAccessMessage(message, session.user.id, session.user.role))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (message.senderId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canEditMessage(message.createdAt)) {
    return Response.json({ error: "Edit window expired (5 minutes)" }, { status: 400 });
  }

  const updated = await prisma.membershipMessage.update({
    where: { id: messageId },
    data: { content: body.content, editedAt: new Date() },
    include: messageInclude,
  });

  return Response.json({ message: serializeMessage(updated) });
}

function serializeMessage(message: {
  id: string;
  content: string;
  attachments: unknown;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  sender: { id: string; name: string; avatarUrl: string | null; role: string };
  meeting?: {
    id: string;
    linkToken: string;
    title: string;
    status: string;
    isOnboardingApproval: boolean;
  } | null;
}) {
  return {
    ...message,
    attachments: Array.isArray(message.attachments) ? message.attachments : null,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    editedAt: message.editedAt?.toISOString() ?? null,
  };
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await params;

  const message = await prisma.membershipMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (message.type !== "TEXT") {
    return Response.json({ error: "This message cannot be deleted" }, { status: 400 });
  }

  if (!(await canAccessMessage(message, session.user.id, session.user.role))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (message.senderId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canEditMessage(message.createdAt)) {
    return Response.json({ error: "Delete window expired (5 minutes)" }, { status: 400 });
  }

  await prisma.membershipMessage.delete({ where: { id: messageId } });

  return Response.json({ success: true });
}
