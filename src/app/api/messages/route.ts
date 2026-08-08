import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const threadUserId = request.nextUrl.searchParams.get("userId");

  if (isAdmin && threadUserId) {
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

    return Response.json({ messages, member, isAdmin: true });
  }

  if (isAdmin) {
    const pendingThreads = await prisma.user.findMany({
      where: {
        role: "MEMBER",
        status: "PENDING",
        questionnaireCompletedAt: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        onboardingDueAt: true,
        questionnaireCompletedAt: true,
        membershipThread: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, type: true },
        },
      },
      orderBy: { questionnaireCompletedAt: "asc" },
    });

    return Response.json({ threads: pendingThreads, isAdmin: true });
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

  return Response.json({ messages, member: me, isAdmin: false });
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
    select: { id: true, status: true, role: true },
  });

  if (!threadUser) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  if (!isAdmin && threadUser.status === "PENDING" && !threadUser) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
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

  return Response.json({ message });
}
