import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const channels = await prisma.channel.findMany({
    orderBy: { name: "asc" },
    include: {
      memberships: {
        where: { status: { in: ["APPROVED", "PENDING"] } },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return Response.json({
    channels: channels.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      type: c.type,
      content: c.content,
      approvedMembers: c.memberships
        .filter((m) => m.status === "APPROVED")
        .map((m) => ({ membershipId: m.id, ...m.user })),
      pendingCount: c.memberships.filter((m) => m.status === "PENDING").length,
    })),
  });
}
