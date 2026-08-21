import { NextRequest } from "next/server";
import { getActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { activeUserFilter } from "@/lib/user-deletion";
import { attachmentSchema } from "@/lib/message-attachments";
import {
  activeConversationFilter,
  getOrCreateActiveAdminMemberConversation,
  pendingDeletedConversationFilter,
  purgeExpiredConversations,
} from "@/lib/message-thread-deletion";

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

function serializeConversation(conversation: {
  id: string;
  kind: string;
  memberUserId: string | null;
  deletedAt: Date | null;
  purgeAt: Date | null;
  deletedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: conversation.id,
    kind: conversation.kind,
    memberUserId: conversation.memberUserId,
    deletedAt: conversation.deletedAt?.toISOString() ?? null,
    purgeAt: conversation.purgeAt?.toISOString() ?? null,
    deletedById: conversation.deletedById,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

function serializeMessage(message: {
  id: string;
  conversationId: string;
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

async function markThreadRead(conversationId: string) {
  await prisma.membershipMessage.updateMany({
    where: {
      conversationId,
      readAt: null,
      sender: { role: "MEMBER" },
    },
    data: { readAt: new Date() },
  });
}

async function markMemberInboxRead(conversationId: string) {
  await prisma.membershipMessage.updateMany({
    where: {
      conversationId,
      readAt: null,
      sender: { role: "ADMIN" },
    },
    data: { readAt: new Date() },
  });
}

async function getAdminThreads() {
  const conversations = await prisma.messageConversation.findMany({
    where: {
      kind: "ADMIN_MEMBER",
      ...activeConversationFilter(),
      memberUser: { role: "MEMBER", ...activeUserFilter() },
    },
    include: {
      memberUser: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          status: true,
          onboardingDueAt: true,
          questionnaireCompletedAt: true,
        },
      },
      membershipMessages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          createdAt: true,
          type: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const unreadGroups = await prisma.membershipMessage.groupBy({
    by: ["conversationId"],
    where: {
      readAt: null,
      sender: { role: "MEMBER" },
      conversation: {
        kind: "ADMIN_MEMBER",
        ...activeConversationFilter(),
        memberUser: { role: "MEMBER", ...activeUserFilter() },
      },
    },
    _count: { id: true },
  });

  const unreadByConversation = new Map(
    unreadGroups.map((row) => [row.conversationId, row._count.id]),
  );

  return conversations
    .filter((conversation) => conversation.memberUser)
    .map((conversation) => {
      const member = conversation.memberUser!;
      const last = conversation.membershipMessages[0];
      return {
        id: member.id,
        conversationId: conversation.id,
        name: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl,
        status: member.status,
        onboardingDueAt: member.onboardingDueAt?.toISOString() ?? null,
        questionnaireCompletedAt: member.questionnaireCompletedAt?.toISOString() ?? null,
        unreadCount: unreadByConversation.get(conversation.id) ?? 0,
        lastMessage: last
          ? {
              content: last.content,
              createdAt: last.createdAt.toISOString(),
              type: last.type,
            }
          : undefined,
        conversation: serializeConversation(conversation),
      };
    })
    .sort((a, b) => {
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      const aTime = a.lastMessage?.createdAt ?? a.conversation.updatedAt;
      const bTime = b.lastMessage?.createdAt ?? b.conversation.updatedAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
}

async function listDeletedAdminMemberThreads(forMemberId?: string) {
  await purgeExpiredConversations();

  return prisma.messageConversation.findMany({
    where: {
      kind: "ADMIN_MEMBER",
      ...pendingDeletedConversationFilter(),
      ...(forMemberId ? { memberUserId: forMemberId } : {}),
      memberUser: { role: "MEMBER", ...activeUserFilter() },
    },
    include: {
      memberUser: {
        select: { id: true, name: true, email: true, avatarUrl: true, status: true },
      },
      membershipMessages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true, type: true },
      },
      deletedBy: { select: { id: true, name: true } },
    },
    orderBy: { deletedAt: "desc" },
  });
}

export async function GET(request: NextRequest) {
  const authz = await getActiveSession();
  if (authz.unauthorized) return authz.unauthorized;
  const session = authz.session;

  await purgeExpiredConversations();

  const isAdmin = session.user.role === "ADMIN";
  const threadUserId = request.nextUrl.searchParams.get("userId");
  const conversationId = request.nextUrl.searchParams.get("conversationId");
  const deletedOnly = request.nextUrl.searchParams.get("deleted") === "1";

  if (deletedOnly) {
    if (isAdmin) {
      const deleted = await listDeletedAdminMemberThreads();
      return Response.json({
        threads: deleted.map((conversation) => ({
          id: conversation.memberUser?.id ?? conversation.memberUserId,
          conversationId: conversation.id,
          name: conversation.memberUser?.name ?? "Member",
          email: conversation.memberUser?.email ?? "",
          avatarUrl: conversation.memberUser?.avatarUrl ?? null,
          status: conversation.memberUser?.status,
          lastMessage: conversation.membershipMessages[0]
            ? {
                content: conversation.membershipMessages[0].content,
                createdAt: conversation.membershipMessages[0].createdAt.toISOString(),
                type: conversation.membershipMessages[0].type,
              }
            : undefined,
          conversation: serializeConversation(conversation),
          deletedBy: conversation.deletedBy,
        })),
        isAdmin: true,
      });
    }

    const deleted = await listDeletedAdminMemberThreads(session.user.id);
    return Response.json({
      threads: deleted.map((conversation) => ({
        conversationId: conversation.id,
        name: "Ministry leadership",
        lastMessage: conversation.membershipMessages[0]
          ? {
              content: conversation.membershipMessages[0].content,
              createdAt: conversation.membershipMessages[0].createdAt.toISOString(),
              type: conversation.membershipMessages[0].type,
            }
          : undefined,
        conversation: serializeConversation(conversation),
        deletedBy: conversation.deletedBy,
      })),
      isAdmin: false,
    });
  }

  if (conversationId) {
    const conversation = await prisma.messageConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation || conversation.kind !== "ADMIN_MEMBER") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const canAccess =
      isAdmin || conversation.memberUserId === session.user.id;
    if (!canAccess) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const isPendingDelete =
      conversation.deletedAt &&
      conversation.purgeAt &&
      conversation.purgeAt > new Date();
    if (conversation.deletedAt && !isPendingDelete) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    if (!conversation.deletedAt) {
      if (isAdmin) await markThreadRead(conversation.id);
      else await markMemberInboxRead(conversation.id);
    }

    const messages = await prisma.membershipMessage.findMany({
      where: { conversationId: conversation.id },
      include: messageInclude,
      orderBy: { createdAt: "asc" },
      take: 300,
    });

    const member = conversation.memberUserId
      ? await prisma.user.findUnique({
          where: { id: conversation.memberUserId },
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            status: true,
            questionnaireCompletedAt: true,
            onboardingDueAt: true,
            questionnaireAnswers: true,
          },
        })
      : null;

    return Response.json({
      messages: messages.map(serializeMessage),
      member,
      conversation: serializeConversation(conversation),
      isAdmin,
    });
  }

  if (isAdmin && threadUserId) {
    const conversation = await getOrCreateActiveAdminMemberConversation(threadUserId);
    await markThreadRead(conversation.id);

    const messages = await prisma.membershipMessage.findMany({
      where: { conversationId: conversation.id },
      include: messageInclude,
      orderBy: { createdAt: "asc" },
      take: 300,
    });

    const member = await prisma.user.findUnique({
      where: { id: threadUserId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        status: true,
        questionnaireCompletedAt: true,
        onboardingDueAt: true,
        questionnaireAnswers: true,
      },
    });

    return Response.json({
      messages: messages.map(serializeMessage),
      member,
      conversation: serializeConversation(conversation),
      isAdmin: true,
    });
  }

  if (isAdmin) {
    const threads = await getAdminThreads();
    return Response.json({ threads, isAdmin: true });
  }

  const conversation = await getOrCreateActiveAdminMemberConversation(session.user.id);
  await markMemberInboxRead(conversation.id);

  const messages = await prisma.membershipMessage.findMany({
    where: { conversationId: conversation.id },
    include: messageInclude,
    orderBy: { createdAt: "asc" },
    take: 300,
  });

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      onboardingDueAt: true,
      questionnaireCompletedAt: true,
      status: true,
    },
  });

  return Response.json({
    messages: messages.map(serializeMessage),
    member: me,
    conversation: serializeConversation(conversation),
    isAdmin: false,
    unreadCount: 0,
  });
}

const postSchema = z.object({
  content: z.string().trim().max(2000).optional(),
  threadUserId: z.string().optional(),
  attachments: z.array(attachmentSchema).max(5).optional(),
});

export async function POST(request: NextRequest) {
  const authz = await getActiveSession();
  if (authz.unauthorized) return authz.unauthorized;
  const session = authz.session;

  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Invalid message" },
        { status: 400 },
      );
    }
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const targetThreadUserId = isAdmin ? body.threadUserId ?? null : session.user.id;

  if (!targetThreadUserId) {
    return Response.json({ error: "threadUserId required" }, { status: 400 });
  }

  if (!isAdmin && targetThreadUserId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const threadUser = await prisma.user.findUnique({
    where: { id: targetThreadUserId },
    select: { id: true, status: true, role: true, deletedAt: true },
  });

  if (!threadUser || threadUser.role !== "MEMBER" || threadUser.deletedAt) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  const trimmedContent = body.content?.trim() ?? "";
  const attachments = body.attachments ?? [];
  if (!trimmedContent && attachments.length === 0) {
    return Response.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const conversation = await getOrCreateActiveAdminMemberConversation(targetThreadUserId);

  const message = await prisma.membershipMessage.create({
    data: {
      conversationId: conversation.id,
      threadUserId: targetThreadUserId,
      senderId: session.user.id,
      type: "TEXT",
      content: trimmedContent,
      attachments: attachments.length > 0 ? attachments : undefined,
    },
    include: messageInclude,
  });

  await prisma.messageConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return Response.json({
    message: serializeMessage(message),
    conversation: serializeConversation(conversation),
  });
}
