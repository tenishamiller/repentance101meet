import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
      channel: { select: { name: true } },
    },
  });

  return Response.json({ membership });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { membershipId } = await request.json();

  await prisma.channelMembership.update({
    where: { id: membershipId },
    data: { status: "REMOVED" },
  });

  return Response.json({ success: true });
}
