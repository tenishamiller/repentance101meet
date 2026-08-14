import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  currentVisibleDmRange,
  currentVisibleMembershipRange,
  deleteMessageThread,
  isMessageThreadRestorable,
  permanentlyDeleteMessageThread,
  purgeExpiredMessageThreads,
  restoreMessageThread,
} from "@/lib/message-thread-deletion";

const postSchema = z.object({
  action: z.enum(["delete", "restore", "purge"]),
  kind: z.enum(["MEMBERSHIP", "MEMBER_DM"]).optional(),
  otherUserId: z.string().min(1).optional(),
  seqFrom: z.number().int().positive().optional(),
  seqTo: z.number().int().positive().optional(),
  id: z.string().min(1).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await purgeExpiredMessageThreads();

  const rows = await prisma.deletedMessageThread.findMany({
    where: {
      userId: session.user.id,
      permanentlyDeletedAt: null,
      purgeAt: { gt: new Date() },
    },
    include: {
      otherUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { deletedAt: "desc" },
  });

  const threads = await Promise.all(
    rows.filter(isMessageThreadRestorable).map(async (row) => {
      const lastMessage =
        row.kind === "MEMBERSHIP"
          ? await prisma.membershipMessage.findFirst({
              where: {
                threadUserId: row.otherUserId,
                threadSeq: { gte: row.seqFrom, lte: row.seqTo },
              },
              orderBy: { createdAt: "desc" },
              select: { content: true, createdAt: true },
            })
          : await prisma.memberDirectMessage.findFirst({
              where: {
                OR: [
                  { senderId: session.user.id, recipientId: row.otherUserId },
                  { senderId: row.otherUserId, recipientId: session.user.id },
                ],
                threadSeq: { gte: row.seqFrom, lte: row.seqTo },
              },
              orderBy: { createdAt: "desc" },
              select: { content: true, createdAt: true },
            });

      const isMinistry =
        row.kind === "MEMBERSHIP" && row.otherUserId === session.user.id;

      return {
        id: row.id,
        kind: row.kind,
        otherUserId: row.otherUserId,
        seqFrom: row.seqFrom,
        seqTo: row.seqTo,
        deletedAt: row.deletedAt.toISOString(),
        purgeAt: row.purgeAt.toISOString(),
        name: isMinistry ? "Ministry leadership" : row.otherUser.name,
        email: isMinistry ? "" : row.otherUser.email,
        avatarUrl: isMinistry ? null : row.otherUser.avatarUrl,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content.trim() || "📎 Attachment",
              createdAt: lastMessage.createdAt.toISOString(),
            }
          : null,
      };
    }),
  );

  return Response.json({ threads });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await purgeExpiredMessageThreads();

  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    if (body.action === "restore") {
      if (!body.id) {
        return Response.json({ error: "Thread id required" }, { status: 400 });
      }
      await restoreMessageThread(session.user.id, body.id);
      return Response.json({ ok: true });
    }

    if (body.action === "purge") {
      if (!body.id) {
        return Response.json({ error: "Thread id required" }, { status: 400 });
      }
      await permanentlyDeleteMessageThread(session.user.id, body.id);
      return Response.json({ ok: true });
    }

    if (!body.kind || !body.otherUserId) {
      return Response.json({ error: "Conversation required" }, { status: 400 });
    }

    if (body.kind === "MEMBERSHIP") {
      if (session.user.role === "MEMBER" && body.otherUserId !== session.user.id) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      if (session.user.role === "ADMIN") {
        const member = await prisma.user.findFirst({
          where: { id: body.otherUserId, role: "MEMBER" },
          select: { id: true },
        });
        if (!member) {
          return Response.json({ error: "Member not found" }, { status: 404 });
        }
      }
    }

    if (body.kind === "MEMBER_DM") {
      if (session.user.role !== "MEMBER" || session.user.status !== "APPROVED") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let seqFrom = body.seqFrom;
    let seqTo = body.seqTo;
    if (seqFrom == null || seqTo == null) {
      const range =
        body.kind === "MEMBERSHIP"
          ? await currentVisibleMembershipRange(session.user.id, body.otherUserId)
          : await currentVisibleDmRange(session.user.id, body.otherUserId);
      if (!range) {
        return Response.json({ error: "There is no conversation to delete." }, { status: 400 });
      }
      seqFrom = range.seqFrom;
      seqTo = range.seqTo;
    }

    const deleted = await deleteMessageThread({
      userId: session.user.id,
      kind: body.kind,
      otherUserId: body.otherUserId,
      seqFrom,
      seqTo,
    });

    return Response.json({
      ok: true,
      thread: {
        id: deleted.id,
        purgeAt: deleted.purgeAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update conversation.";
    return Response.json({ error: message }, { status: 400 });
  }
}
