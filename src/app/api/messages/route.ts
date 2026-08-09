import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { activeUserFilter } from "@/lib/user-deletion";

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

async function getAdminThreads() {
  const latestMessages = await prisma.membershipMessage.findMany({
    distinct: ["threadUserId"],
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
  });

  const unreadGroups = await prisma.membershipMessage.groupBy({
    by: ["threadUserId"],
    where: {
      readAt: null,
      sender: { role: "MEMBER" },
      threadUser: { role: "MEMBER", ...activeUserFilter() },
    },
    _count: { id: true },
  });

  const unreadByThread = new Map(
    unreadGroups.map((row) => [row.threadUserId, row._count.id]),
  );

  const threads = latestMessages
    .map((msg) => ({
      id: msg.threadUser.id,
      name: msg.threadUser.name,
      email: msg.threadUser.email,
      avatarUrl: msg.threadUser.avatarUrl,
      status: msg.threadUser.status,
      onboardingDueAt: msg.threadUser.onboardingDueAt?.toISOString() ?? null,
      questionnaireCompletedAt:
        msg.threadUser.questionnaireCompletedAt?.toISOString() ?? null,
      unreadCount: unreadByThread.get(msg.threadUserId) ?? 0,
      lastMessage: {
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        type: msg.type,
      },
    }))
    .sort((a, b) => {
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      return (
        new Date(b.lastMessage.createdAt).getTime() -
        new Date(a.lastMessage.createdAt).getTime()
      );
    });

  return threads;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const threadUserId = request.nextUrl.searchParams.get("userId");

  if (isAdmin && threadUserId) {
    await markThreadRead(threadUserId);

    const messages = await prisma.membershipMessage.findMany({
      where: { threadUserId },
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
      isAdmin: true,
    });
  }

  if (isAdmin) {
    const threads = await getAdminThreads();
    return Response.json({ threads, isAdmin: true });
  }

  const messages = await prisma.membershipMessage.findMany({
    where: { threadUserId: session.user.id },
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
    isAdmin: false,
  });
}

const postSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  threadUserId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = postSchema.parse(await request.json());
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

  const message = await prisma.membershipMessage.create({
    data: {
      threadUserId: targetThreadUserId,
      senderId: session.user.id,
      type: "TEXT",
      content: body.content,
    },
    include: messageInclude,
  });

  return Response.json({ message: serializeMessage(message) });
}

function serializeMessage(message: {
  id: string;
  content: string;
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
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    editedAt: message.editedAt?.toISOString() ?? null,
  };
}
