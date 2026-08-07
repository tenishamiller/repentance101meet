import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ slug: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.status !== "APPROVED" && session.user.role !== "ADMIN") {
    return Response.json({ error: "Account not approved" }, { status: 403 });
  }

  const { slug } = await params;
  const channel = await prisma.channel.findUnique({ where: { slug } });
  if (!channel || channel.type === "PUBLIC") {
    return Response.json({ error: "Channel not found" }, { status: 404 });
  }

  const membership = await prisma.channelMembership.upsert({
    where: {
      userId_channelId: {
        userId: session.user.id,
        channelId: channel.id,
      },
    },
    update: { status: "PENDING" },
    create: {
      userId: session.user.id,
      channelId: channel.id,
      status: "PENDING",
    },
  });

  return Response.json({ membership });
}
