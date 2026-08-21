import { getActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activeUserFilter } from "@/lib/user-deletion";
import {
  activeConversationFilter,
  purgeExpiredConversations,
} from "@/lib/message-thread-deletion";

export async function GET() {
  const authz = await getActiveSession();
  if (authz.unauthorized) return authz.unauthorized;
  const session = authz.session;

  await purgeExpiredConversations();

  if (session.user.role === "ADMIN") {
    const unread = await prisma.membershipMessage.count({
      where: {
        readAt: null,
        sender: { role: "MEMBER" },
        conversation: {
          kind: "ADMIN_MEMBER",
          ...activeConversationFilter(),
          memberUser: { role: "MEMBER", ...activeUserFilter() },
        },
      },
    });

    return Response.json({ unread });
  }

  const adminUnread = await prisma.membershipMessage.count({
    where: {
      threadUserId: session.user.id,
      readAt: null,
      sender: { role: "ADMIN" },
      conversation: { ...activeConversationFilter() },
    },
  });

  const peerUnread = await prisma.memberDirectMessage.count({
    where: {
      recipientId: session.user.id,
      readAt: null,
      conversation: { ...activeConversationFilter() },
    },
  });

  return Response.json({
    unread: adminUnread + peerUnread,
    adminUnread,
    peerUnread,
  });
}
