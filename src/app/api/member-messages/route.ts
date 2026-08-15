import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activeUserFilter } from "@/lib/user-deletion";
import { assertApprovedMember, getDmRelation } from "@/lib/member-dm";
import { attachmentSchema } from "@/lib/message-attachments";
import {
  activeConversationFilter,
  getOrCreateActiveMemberDmConversation,
  pendingDeletedConversationFilter,
  purgeExpiredConversations,
} from "@/lib/message-thread-deletion";

function serializeMessage(message: {
  id: string;
  conversationId: string;
  content: string;
  attachments: unknown;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  sender: { id: string; name: string; avatarUrl: string | null; role: string };
}) {
  return {
    ...message,
    type: "TEXT" as const,
    attachments: Array.isArray(message.attachments) ? message.attachments : null,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    editedAt: message.editedAt?.toISOString() ?? null,
    meeting: null,
  };
}

function serializeConversation(conversation: {
  id: string;
  kind: string;
  deletedAt: Date | null;
  purgeAt: Date | null;
  deletedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  participantAId: string | null;
  participantBId: string | null;
}) {
  return {
    id: conversation.id,
    kind: conversation.kind,
    participantAId: conversation.participantAId,
    participantBId: conversation.participantBId,
    deletedAt: conversation.deletedAt?.toISOString() ?? null,
    purgeAt: conversation.purgeAt?.toISOString() ?? null,
    deletedById: conversation.deletedById,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

async function requireApprovedMember() {
  const session = await auth();
  if (!session?.user) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "MEMBER" || session.user.status !== "APPROVED") {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  const authz = await requireApprovedMember();
  if (authz.error) return authz.error;
  const meId = authz.session.user.id;
  await purgeExpiredConversations();

  const otherId = request.nextUrl.searchParams.get("userId");
  const conversationId = request.nextUrl.searchParams.get("conversationId");
  const deletedOnly = request.nextUrl.searchParams.get("deleted") === "1";

  if (deletedOnly) {
    const deleted = await prisma.messageConversation.findMany({
      where: {
        kind: "MEMBER_DM",
        ...pendingDeletedConversationFilter(),
        OR: [{ participantAId: meId }, { participantBId: meId }],
      },
      include: {
        participantA: { select: { id: true, name: true, email: true, avatarUrl: true } },
        participantB: { select: { id: true, name: true, email: true, avatarUrl: true } },
        directMessages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true },
        },
        deletedBy: { select: { id: true, name: true } },
      },
      orderBy: { deletedAt: "desc" },
    });

    return Response.json({
      threads: deleted.map((conversation) => {
        const other =
          conversation.participantAId === meId
            ? conversation.participantB
            : conversation.participantA;
        return {
          id: other?.id,
          conversationId: conversation.id,
          name: other?.name ?? "Member",
          email: other?.email ?? "",
          avatarUrl: other?.avatarUrl ?? null,
          lastMessage: conversation.directMessages[0]
            ? {
                content: conversation.directMessages[0].content,
                createdAt: conversation.directMessages[0].createdAt.toISOString(),
              }
            : null,
          conversation: serializeConversation(conversation),
          deletedBy: conversation.deletedBy,
        };
      }),
    });
  }

  if (conversationId) {
    const conversation = await prisma.messageConversation.findUnique({
      where: { id: conversationId },
    });
    if (
      !conversation ||
      conversation.kind !== "MEMBER_DM" ||
      (conversation.participantAId !== meId && conversation.participantBId !== meId)
    ) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const isPendingDelete =
      conversation.deletedAt &&
      conversation.purgeAt &&
      conversation.purgeAt > new Date();
    if (conversation.deletedAt && !isPendingDelete) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const otherIdFromThread =
      conversation.participantAId === meId
        ? conversation.participantBId
        : conversation.participantAId;
    if (!otherIdFromThread) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const other = await assertApprovedMember(otherIdFromThread);
    const relation = await getDmRelation(meId, otherIdFromThread);

    if (!conversation.deletedAt && relation.canMessage) {
      await prisma.memberDirectMessage.updateMany({
        where: { conversationId, senderId: otherIdFromThread, recipientId: meId, readAt: null },
        data: { readAt: new Date() },
      });
    }

    const messages =
      conversation.deletedAt || relation.canMessage
        ? await prisma.memberDirectMessage.findMany({
            where: { conversationId },
            include: {
              sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
            },
            orderBy: { createdAt: "asc" },
            take: 300,
          })
        : [];

    return Response.json({
      member: other,
      relation,
      conversation: serializeConversation(conversation),
      messages: messages.map(serializeMessage),
    });
  }

  if (otherId) {
    if (otherId === meId) {
      return Response.json({ error: "Invalid member" }, { status: 400 });
    }
    const other = await assertApprovedMember(otherId);
    if (!other) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }

    const relation = await getDmRelation(meId, otherId);
    const conversation = await getOrCreateActiveMemberDmConversation(meId, otherId);

    if (relation.canMessage) {
      await prisma.memberDirectMessage.updateMany({
        where: {
          conversationId: conversation.id,
          senderId: otherId,
          recipientId: meId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    }

    const messages = relation.canMessage
      ? await prisma.memberDirectMessage.findMany({
          where: { conversationId: conversation.id },
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
          take: 300,
        })
      : [];

    return Response.json({
      member: other,
      relation,
      conversation: serializeConversation(conversation),
      messages: messages.map(serializeMessage),
    });
  }

  const [members, outgoing, incoming, blocks, activeConversations] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "MEMBER",
        status: "APPROVED",
        id: { not: meId },
        ...activeUserFilter(),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, avatarUrl: true },
    }),
    prisma.memberDmRequest.findMany({ where: { fromUserId: meId } }),
    prisma.memberDmRequest.findMany({ where: { toUserId: meId } }),
    prisma.memberDmBlock.findMany({
      where: { OR: [{ blockerId: meId }, { blockedId: meId }] },
    }),
    prisma.messageConversation.findMany({
      where: {
        kind: "MEMBER_DM",
        ...activeConversationFilter(),
        OR: [{ participantAId: meId }, { participantBId: meId }],
      },
      include: {
        directMessages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            senderId: true,
            recipientId: true,
            content: true,
            createdAt: true,
            readAt: true,
          },
        },
      },
    }),
  ]);

  const outgoingBy = new Map(outgoing.map((r) => [r.toUserId, r]));
  const incomingBy = new Map(incoming.map((r) => [r.fromUserId, r]));
  const blockedByMe = new Set(blocks.filter((b) => b.blockerId === meId).map((b) => b.blockedId));
  const blockedMe = new Set(blocks.filter((b) => b.blockedId === meId).map((b) => b.blockerId));

  const conversationByOther = new Map<string, (typeof activeConversations)[number]>();
  for (const conversation of activeConversations) {
    const other =
      conversation.participantAId === meId
        ? conversation.participantBId
        : conversation.participantAId;
    if (!other) continue;
    const current = conversationByOther.get(other);
    if (!current || conversation.createdAt > current.createdAt) {
      conversationByOther.set(other, conversation);
    }
  }

  const unreadGroups = await prisma.memberDirectMessage.groupBy({
    by: ["senderId"],
    where: {
      recipientId: meId,
      readAt: null,
      conversation: { ...activeConversationFilter() },
    },
    _count: { id: true },
  });
  const unreadBy = new Map(unreadGroups.map((row) => [row.senderId, row._count.id]));

  const directory = members.map((member) => {
    const out = outgoingBy.get(member.id);
    const inn = incomingBy.get(member.id);
    const approved = out?.status === "APPROVED" || inn?.status === "APPROVED";
    const iBlocked = blockedByMe.has(member.id);
    const theyBlocked = blockedMe.has(member.id);
    const conversation = conversationByOther.get(member.id);
    const last = conversation?.directMessages[0];
    return {
      ...member,
      conversationId: conversation?.id ?? null,
      blockedByMe: iBlocked,
      blockedMe: theyBlocked,
      pendingOutgoing: out?.status === "PENDING",
      pendingIncoming: inn?.status === "PENDING",
      approved,
      canMessage: approved && !iBlocked && !theyBlocked,
      unreadCount: unreadBy.get(member.id) ?? 0,
      lastMessage: last
        ? {
            content: last.content.trim() || "📎 Attachment",
            createdAt: last.createdAt.toISOString(),
          }
        : null,
    };
  });

  return Response.json({ members: directory });
}

const postSchema = z.object({
  userId: z.string().min(1),
  content: z.string().trim().max(2000).optional(),
  attachments: z.array(attachmentSchema).max(5).optional(),
});

export async function POST(request: NextRequest) {
  const authz = await requireApprovedMember();
  if (authz.error) return authz.error;
  const meId = authz.session.user.id;

  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid message" }, { status: 400 });
  }

  if (body.userId === meId) {
    return Response.json({ error: "Invalid member" }, { status: 400 });
  }

  const other = await assertApprovedMember(body.userId);
  if (!other) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  const relation = await getDmRelation(meId, body.userId);
  if (relation.blockedByMe || relation.blockedMe) {
    return Response.json({ error: "You cannot message this member." }, { status: 403 });
  }
  if (!relation.canMessage) {
    return Response.json(
      { error: "They need to approve your request before you can send messages." },
      { status: 403 },
    );
  }

  const trimmed = body.content?.trim() ?? "";
  const attachments = body.attachments ?? [];
  if (!trimmed && attachments.length === 0) {
    return Response.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const conversation = await getOrCreateActiveMemberDmConversation(meId, body.userId);

  const message = await prisma.memberDirectMessage.create({
    data: {
      conversationId: conversation.id,
      senderId: meId,
      recipientId: body.userId,
      content: trimmed,
      attachments: attachments.length > 0 ? attachments : undefined,
    },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
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
