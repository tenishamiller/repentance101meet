import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activeUserFilter } from "@/lib/user-deletion";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const unread = await prisma.membershipMessage.count({
    where: {
      readAt: null,
      sender: { role: "MEMBER" },
      threadUser: { role: "MEMBER", ...activeUserFilter() },
    },
  });

  return Response.json({ unread });
}
