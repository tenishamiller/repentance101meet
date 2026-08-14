import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activeUserFilter } from "@/lib/user-deletion";
import { assertApprovedMember, getDmRelation, pairFilter } from "@/lib/member-dm";
import { attachmentSchema } from "@/lib/message-attachments";
import {
  hiddenSeqsForUser,
  listThreadDeletions,
  nextDmThreadSeq,
  purgeExpiredMessageThreads,
  seqFilter,
  visibleInboxRanges,
} from "@/lib/message-thread-deletion";

function serializeMessage(message: {
  id: string;
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

function parseSeqParam(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: NextRequest) {
  const authz = await requireApprovedMember();
  if (authz.error) return authz.error;
  const meId = authz.session.user.id;
  const otherId = request.nextUrl.searchParams.get("userId");
  const seqFrom = parseSeqParam(request.nextUrl.searchParams.get("seqFrom"));
  const seqTo = parseSeqParam(request.nextUrl.searchParams.get("seqTo"));
  const threadSeq = seqFilter(seqFrom, seqTo);

  await purgeExpiredMessageThreads();

  if (otherId) {
    if (otherId === meId) {
      return Response.json({ error: "Invalid member" }, { status: 400 });
    }
    const other = await assertApprovedMember(otherId);
    if (!other) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }

    const relation = await getDmRelation(meId, otherId);
    if (relation.canMessage) {
      await prisma.memberDirectMessage.updateMany({
        where: { senderId: otherId, recipientId: meId, readAt: null },
        data: { readAt: new Date() },
      });
    }

    const deletions = await listThreadDeletions(meId, "MEMBER_DM", otherId);
    const hidden = hiddenSeqsForUser(deletions);
    const messages = relation.canMessage
      ? await prisma.memberDirectMessage.findMany({
          where: {
            ...pairFilter(meId, otherId),
            ...(threadSeq ? { threadSeq } : {}),
          },
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
          take: 300,
        })
      : [];
    const visible = threadSeq
      ? messages
      : messages.filter((msg) => !hidden.has(msg.threadSeq));

    return Response.json({
      member: other,
      relation,
      messages: visible.map(serializeMessage),
    });
  }

  const [members, outgoing, incoming, blocks, latestSent, latestReceived, dmDeletions] =
    await Promise.all([
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
    prisma.memberDirectMessage.findMany({
      where: { senderId: meId },
      orderBy: { createdAt: "desc" },
      select: {
        recipientId: true,
        content: true,
        createdAt: true,
        threadSeq: true,
      },
    }),
    prisma.memberDirectMessage.findMany({
      where: { recipientId: meId },
      orderBy: { createdAt: "desc" },
      select: {
        senderId: true,
        content: true,
        createdAt: true,
        readAt: true,
        threadSeq: true,
      },
    }),
    listThreadDeletions(meId, "MEMBER_DM"),
  ]);

  const outgoingBy = new Map(outgoing.map((r) => [r.toUserId, r]));
  const incomingBy = new Map(incoming.map((r) => [r.fromUserId, r]));
  const blockedByMe = new Set(blocks.filter((b) => b.blockerId === meId).map((b) => b.blockedId));
  const blockedMe = new Set(blocks.filter((b) => b.blockedId === meId).map((b) => b.blockerId));

  const lastByOther = new Map<string, { content: string; createdAt: Date; threadSeq: number }>();
  const seqsByOther = new Map<string, Set<number>>();
  function addSeq(otherId: string, seq: number) {
    const set = seqsByOther.get(otherId) ?? new Set<number>();
    set.add(seq);
    seqsByOther.set(otherId, set);
  }
  for (const msg of latestSent) {
    addSeq(msg.recipientId, msg.threadSeq);
    const hidden = hiddenSeqsForUser(
      dmDeletions.filter((row) => row.otherUserId === msg.recipientId),
    );
    if (hidden.has(msg.threadSeq)) continue;
    const current = lastByOther.get(msg.recipientId);
    if (!current || msg.createdAt > current.createdAt) {
      lastByOther.set(msg.recipientId, {
        content: msg.content,
        createdAt: msg.createdAt,
        threadSeq: msg.threadSeq,
      });
    }
  }
  for (const msg of latestReceived) {
    addSeq(msg.senderId, msg.threadSeq);
    const hidden = hiddenSeqsForUser(
      dmDeletions.filter((row) => row.otherUserId === msg.senderId),
    );
    if (hidden.has(msg.threadSeq)) continue;
    const current = lastByOther.get(msg.senderId);
    if (!current || msg.createdAt > current.createdAt) {
      lastByOther.set(msg.senderId, {
        content: msg.content,
        createdAt: msg.createdAt,
        threadSeq: msg.threadSeq,
      });
    }
  }

  const unreadGroups = await prisma.memberDirectMessage.groupBy({
    by: ["senderId", "threadSeq"],
    where: { recipientId: meId, readAt: null },
    _count: { id: true },
  });

  const directory = members.map((member) => {
    const out = outgoingBy.get(member.id);
    const inn = incomingBy.get(member.id);
    const approved = out?.status === "APPROVED" || inn?.status === "APPROVED";
    const iBlocked = blockedByMe.has(member.id);
    const theyBlocked = blockedMe.has(member.id);
    const memberDeletions = dmDeletions.filter((row) => row.otherUserId === member.id);
    const hidden = hiddenSeqsForUser(memberDeletions);
    const unreadCount = unreadGroups
      .filter((row) => row.senderId === member.id && !hidden.has(row.threadSeq))
      .reduce((sum, row) => sum + row._count.id, 0);
    const ranges = visibleInboxRanges([...(seqsByOther.get(member.id) ?? [])], memberDeletions);
    const latestRange = ranges.at(-1) ?? null;
    return {
      ...member,
      blockedByMe: iBlocked,
      blockedMe: theyBlocked,
      pendingOutgoing: out?.status === "PENDING",
      pendingIncoming: inn?.status === "PENDING",
      approved,
      canMessage: approved && !iBlocked && !theyBlocked,
      unreadCount,
      seqFrom: latestRange?.seqFrom ?? null,
      seqTo: latestRange?.seqTo ?? null,
      lastMessage: lastByOther.get(member.id)
        ? {
            content: lastByOther.get(member.id)!.content.trim() || "📎 Attachment",
            createdAt: lastByOther.get(member.id)!.createdAt.toISOString(),
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

  const threadSeq = await nextDmThreadSeq(meId, body.userId);
  const message = await prisma.memberDirectMessage.create({
    data: {
      senderId: meId,
      recipientId: body.userId,
      content: trimmed,
      attachments: attachments.length > 0 ? attachments : undefined,
      threadSeq,
    },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });

  return Response.json({ message: serializeMessage(message) });
}
