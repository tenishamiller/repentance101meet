import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createMeetingToken, startRoomRecording } from "@/lib/livekit";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const meetings = await prisma.meeting.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return Response.json({ meetings });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title } = await request.json();
  const linkToken = uuidv4().replace(/-/g, "").slice(0, 16);
  const livekitRoom = `repentance101-${linkToken}`;

  const meeting = await prisma.meeting.create({
    data: {
      title: title ?? "Repentance 101 Teaching",
      linkToken,
      livekitRoom,
      createdById: session.user.id,
      status: "SCHEDULED",
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return Response.json({
    meeting,
    joinUrl: `${appUrl}/meeting/${linkToken}`,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { meetingId, action } = await request.json();
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });

  if (!meeting) {
    return Response.json({ error: "Meeting not found" }, { status: 404 });
  }

  if (action === "start") {
    await startRoomRecording(meeting.livekitRoom!);
    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "LIVE", startedAt: new Date() },
    });
    return Response.json({ meeting: updated });
  }

  if (action === "end") {
    const recordingUrl = `/recordings/${meeting.livekitRoom}-${Date.now()}.mp4`;
    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: "ENDED",
        endedAt: new Date(),
        recordingUrl,
      },
    });
    return Response.json({ meeting: updated });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
