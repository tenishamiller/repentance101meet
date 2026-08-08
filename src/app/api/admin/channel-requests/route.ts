import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logMemberActivity } from "@/lib/member-activity";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { membershipId, status } = await request.json();

  const allowed = ["PENDING", "APPROVED", "DENIED"];
  if (!allowed.includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const membership = await prisma.channelMembership.update({
    where: { id: membershipId },
    data: { status },
    include: {
      user: { select: { name: true } },
      channel: { select: { id: true, name: true, type: true } },
    },
  });

  const typeMap = {
    APPROVED: "CHANNEL_APPROVED" as const,
    DENIED: "CHANNEL_DENIED" as const,
    PENDING: "CHANNEL_REQUESTED" as const,
  };
  const logType = typeMap[status as keyof typeof typeMap];
  if (logType && logType !== "CHANNEL_REQUESTED") {
    await logMemberActivity({
      userId: membership.userId,
      type: logType,
      channelId: membership.channelId,
      actorId: session.user.id,
      label: `${status === "APPROVED" ? "Approved" : "Denied"} for ${membership.channel.name}`,
    });
  }

  return Response.json({ membership });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { membershipId, reason } = await request.json();

  const membership = await prisma.channelMembership.findUnique({
    where: { id: membershipId },
    include: { channel: { select: { id: true, name: true } } },
  });

  if (!membership) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.channelMembership.update({
    where: { id: membershipId },
    data: { status: "REMOVED" },
  });

  await logMemberActivity({
    userId: membership.userId,
    type: "CHANNEL_REMOVED",
    channelId: membership.channelId,
    reason: reason ? String(reason) : undefined,
    actorId: session.user.id,
    label: `Removed from ${membership.channel.name}`,
  });

  return Response.json({ success: true });
}
