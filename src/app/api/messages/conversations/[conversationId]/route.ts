import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  permanentlyDeleteConversation,
  purgeExpiredConversations,
  restoreConversation,
  softDeleteConversation,
  userCanAccessConversation,
} from "@/lib/message-thread-deletion";

type RouteParams = { params: Promise<{ conversationId: string }> };

const actionSchema = z.object({
  action: z.enum(["restore", "purge"]),
  confirmPermanent: z.boolean().optional(),
});

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await purgeExpiredConversations();

  const { conversationId } = await params;
  const conversation = await prisma.messageConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!userCanAccessConversation(conversation, session.user.id, session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (conversation.kind === "MEMBER_DM" && session.user.role === "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (conversation.deletedAt) {
    return Response.json({ error: "Thread is already deleted" }, { status: 400 });
  }

  const updated = await softDeleteConversation(conversationId, session.user.id);
  return Response.json({
    success: true,
    conversation: {
      id: updated.id,
      deletedAt: updated.deletedAt?.toISOString() ?? null,
      purgeAt: updated.purgeAt?.toISOString() ?? null,
    },
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await purgeExpiredConversations();

  const { conversationId } = await params;
  let body: z.infer<typeof actionSchema>;
  try {
    body = actionSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const conversation = await prisma.messageConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!userCanAccessConversation(conversation, session.user.id, session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (conversation.kind === "MEMBER_DM" && session.user.role === "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (body.action === "restore") {
    try {
      const restored = await restoreConversation(conversationId);
      return Response.json({
        success: true,
        conversation: {
          id: restored.id,
          deletedAt: null,
          purgeAt: null,
        },
      });
    } catch {
      return Response.json(
        { error: "Conversation not found or restore window expired" },
        { status: 400 },
      );
    }
  }

  if (!body.confirmPermanent) {
    return Response.json(
      {
        error:
          "Check the confirmation box to permanently delete this thread. This cannot be undone.",
      },
      { status: 400 },
    );
  }

  if (!conversation.deletedAt) {
    return Response.json(
      { error: "Soft-delete the thread first, then permanently delete within 30 days." },
      { status: 400 },
    );
  }

  if (!conversation.purgeAt || conversation.purgeAt <= new Date()) {
    return Response.json({ error: "Restore window expired" }, { status: 400 });
  }

  await permanentlyDeleteConversation(conversationId);
  return Response.json({ success: true, purged: true });
}
