import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activeUserFilter } from "@/lib/user-deletion";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "ADMIN") {
    const unread = await prisma.membershipMessage.count({
      where: {
        readAt: null,
        sender: { role: "MEMBER" },
        threadUser: { role: "MEMBER", ...activeUserFilter() },
      },
    });

    return Response.json({ unread });
  }

  const adminUnread = await prisma.membershipMessage.count({
    where: {
      threadUserId: session.user.id,
      readAt: null,
      sender: { role: "ADMIN" },
    },
  });

  const peerUnread = await prisma.memberDirectMessage.count({
    where: {
      recipientId: session.user.id,
      readAt: null,
    },
  });

  return Response.json({
    unread: adminUnread + peerUnread,
    adminUnread,
    peerUnread,
  });
}
