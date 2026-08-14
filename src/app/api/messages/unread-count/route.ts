import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activeUserFilter } from "@/lib/user-deletion";
import {
  hiddenSeqsForUser,
  listThreadDeletions,
  purgeExpiredMessageThreads,
} from "@/lib/message-thread-deletion";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await purgeExpiredMessageThreads();

  if (session.user.role === "ADMIN") {
    const [rows, deletions] = await Promise.all([
      prisma.membershipMessage.findMany({
        where: {
          readAt: null,
          sender: { role: "MEMBER" },
          threadUser: { role: "MEMBER", ...activeUserFilter() },
        },
        select: { threadUserId: true, threadSeq: true },
      }),
      listThreadDeletions(session.user.id, "MEMBERSHIP"),
    ]);
    const unread = rows.filter((row) => {
      const hidden = hiddenSeqsForUser(
        deletions.filter((item) => item.otherUserId === row.threadUserId),
      );
      return !hidden.has(row.threadSeq);
    }).length;

    return Response.json({ unread });
  }

  const [adminRows, peerRows, membershipDeletions, dmDeletions] = await Promise.all([
    prisma.membershipMessage.findMany({
      where: {
        threadUserId: session.user.id,
        readAt: null,
        sender: { role: "ADMIN" },
      },
      select: { threadSeq: true },
    }),
    prisma.memberDirectMessage.findMany({
      where: {
        recipientId: session.user.id,
        readAt: null,
      },
      select: { senderId: true, threadSeq: true },
    }),
    listThreadDeletions(session.user.id, "MEMBERSHIP", session.user.id),
    listThreadDeletions(session.user.id, "MEMBER_DM"),
  ]);

  const membershipHidden = hiddenSeqsForUser(membershipDeletions);
  const adminUnread = adminRows.filter((row) => !membershipHidden.has(row.threadSeq)).length;
  const peerUnread = peerRows.filter((row) => {
    const hidden = hiddenSeqsForUser(
      dmDeletions.filter((item) => item.otherUserId === row.senderId),
    );
    return !hidden.has(row.threadSeq);
  }).length;

  return Response.json({
    unread: adminUnread + peerUnread,
    adminUnread,
    peerUnread,
  });
}
