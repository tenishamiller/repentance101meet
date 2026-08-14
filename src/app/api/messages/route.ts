import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { activeUserFilter } from "@/lib/user-deletion";
import { attachmentSchema } from "@/lib/message-attachments";
import {
  hiddenSeqsForUser,
  listThreadDeletions,
  nextMembershipThreadSeq,
  purgeExpiredMessageThreads,
  seqFilter,
  visibleInboxRanges,
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

async function markThreadRead(threadUserId: string) {
  await prisma.membershipMessage.updateMany({
    where: {
      threadUserId,
      readAt: null,
      sender: { role: "MEMBER" },
    },
    data: { readAt: new Date() },
  });
}

async function markMemberInboxRead(threadUserId: string) {
  await prisma.membershipMessage.updateMany({
    where: {
      threadUserId,
      readAt: null,
      sender: { role: "ADMIN" },
    },
    data: { readAt: new Date() },
  });
}

async function getAdminThreads(adminId: string) {
  const [latestMessages, unreadGroups, deletions] = await Promise.all([
    prisma.membershipMessage.findMany({
      distinct: ["threadUserId", "threadSeq"],
      orderBy: { createdAt: "desc" },
      include: {
        threadUser: {
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
      },
      where: {
        threadUser: { role: "MEMBER", ...activeUserFilter() },
      },
    }),
    prisma.membershipMessage.groupBy({
      by: ["threadUserId", "threadSeq"],
      where: {
        readAt: null,
        sender: { role: "MEMBER" },
        threadUser: { role: "MEMBER", ...activeUserFilter() },
      },
      _count: { id: true },
    }),
    listThreadDeletions(adminId, "MEMBERSHIP"),
  ]);

  const unreadBy = new Map(
    unreadGroups.map((row) => [`${row.threadUserId}:${row.threadSeq}`, row._count.id]),
  );

  const byMember = new Map<string, typeof latestMessages>();
  for (const msg of latestMessages) {
    const list = byMember.get(msg.threadUserId) ?? [];
    list.push(msg);
    byMember.set(msg.threadUserId, list);
  }

  const threads = [];
  for (const [threadUserId, messages] of byMember) {
    const memberDeletions = deletions.filter((row) => row.otherUserId === threadUserId);
    const ranges = visibleInboxRanges(
      messages.map((msg) => msg.threadSeq),
      memberDeletions,
    );
    const member = messages[0]?.threadUser;
    if (!member) continue;

    for (const range of ranges) {
      const inRange = messages.filter(
        (msg) => msg.threadSeq >= range.seqFrom && msg.threadSeq <= range.seqTo,
      );
      const last = inRange.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];
      if (!last) continue;
      let unreadCount = 0;
      for (let seq = range.seqFrom; seq <= range.seqTo; seq += 1) {
        unreadCount += unreadBy.get(`${threadUserId}:${seq}`) ?? 0;
      }
      threads.push({
        id: member.id,
        seqFrom: range.seqFrom,
        seqTo: range.seqTo,
        name: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl,
        status: member.status,
        onboardingDueAt: member.onboardingDueAt?.toISOString() ?? null,
        questionnaireCompletedAt: member.questionnaireCompletedAt?.toISOString() ?? null,
        unreadCount,
        lastMessage: {
          content: last.content,
          createdAt: last.createdAt.toISOString(),
          type: last.type,
        },
      });
    }
  }

  return threads.sort((a, b) => {
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    return (
      new Date(b.lastMessage.createdAt).getTime() -
      new Date(a.lastMessage.createdAt).getTime()
    );
  });
}

function parseSeqParam(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await purgeExpiredMessageThreads();

  const isAdmin = session.user.role === "ADMIN";
  const threadUserId = request.nextUrl.searchParams.get("userId");
  const seqFrom = parseSeqParam(request.nextUrl.searchParams.get("seqFrom"));
  const seqTo = parseSeqParam(request.nextUrl.searchParams.get("seqTo"));
  const threadSeq = seqFilter(seqFrom, seqTo);

  if (isAdmin && threadUserId) {
    const deletions = await listThreadDeletions(session.user.id, "MEMBERSHIP", threadUserId);
    const hidden = hiddenSeqsForUser(deletions);
    const where = {
      threadUserId,
      ...(threadSeq ? { threadSeq } : {}),
    };

    const messages = await prisma.membershipMessage.findMany({
      where,
      include: messageInclude,
      orderBy: { createdAt: "asc" },
      take: 300,
    });
    const visible = threadSeq
      ? messages
      : messages.filter((msg) => !hidden.has(msg.threadSeq));

    await markThreadRead(threadUserId);

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
      messages: visible.map(serializeMessage),
      member,
      isAdmin: true,
    });
  }

  if (isAdmin) {
    const threads = await getAdminThreads(session.user.id);
    return Response.json({ threads, isAdmin: true });
  }

  const deletions = await listThreadDeletions(session.user.id, "MEMBERSHIP", session.user.id);
  const hidden = hiddenSeqsForUser(deletions);
  const messages = await prisma.membershipMessage.findMany({
    where: {
      threadUserId: session.user.id,
      ...(threadSeq ? { threadSeq } : {}),
    },
    include: messageInclude,
    orderBy: { createdAt: "asc" },
    take: 300,
  });
  const visible = threadSeq
    ? messages
    : messages.filter((msg) => !hidden.has(msg.threadSeq));

  await markMemberInboxRead(session.user.id);

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      onboardingDueAt: true,
      questionnaireCompletedAt: true,
      status: true,
    },
  });

  return Response.json({
    messages: visible.map(serializeMessage),
    member: me,
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
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const targetThreadUserId = isAdmin
    ? body.threadUserId ?? null
    : session.user.id;

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

  const threadSeq = await nextMembershipThreadSeq(targetThreadUserId);
  const message = await prisma.membershipMessage.create({
    data: {
      threadUserId: targetThreadUserId,
      senderId: session.user.id,
      type: "TEXT",
      content: trimmedContent,
      attachments: attachments.length > 0 ? attachments : undefined,
      threadSeq,
    },
    include: messageInclude,
  });

  return Response.json({ message: serializeMessage(message) });
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
