import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { removeLiveKitParticipant } from "@/lib/livekit-admin";

type RouteParams = { params: Promise<{ token: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting || meeting.deletedAt) {
    return Response.json({ error: "Meeting not found" }, { status: 404 });
  }

  const isHost = meeting.createdById === session.user.id;
  if (!isHost && session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const targetUserId = typeof body.userId === "string" ? body.userId : null;
  if (!targetUserId) {
    return Response.json({ error: "Invalid userId" }, { status: 400 });
  }

  const roomKind = meeting.kind === "PRIVATE" ? "private" : "livestream";
  await removeLiveKitParticipant(token, targetUserId, roomKind);

  return Response.json({ success: true });
}
