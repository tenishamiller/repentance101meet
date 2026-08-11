import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clearKickSignalsForUser } from "@/lib/meeting-blocks";
import {
  assertLiveKitCredentials,
  createLiveKitAccessToken,
  getLiveKitConfig,
  getPublicLiveKitUrl,
  liveKitRoomName,
} from "@/lib/livekit-server";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getLiveKitConfig();
  const serverUrl = getPublicLiveKitUrl();
  if (!config || !serverUrl) {
    return Response.json({ error: "LiveKit is not configured" }, { status: 503 });
  }

  try {
    await assertLiveKitCredentials(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : "LiveKit credentials rejected";
    console.error("LiveKit credential check failed:", message);
    return Response.json(
      {
        error:
          "Video server credentials are invalid. Update LIVEKIT_API_KEY and LIVEKIT_API_SECRET in Vercel from your LiveKit Cloud project settings.",
        detail: message,
      },
      { status: 503 },
    );
  }

  const { token } = await params;
  let meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting || meeting.deletedAt) {
    return Response.json({ error: "Meeting not found" }, { status: 404 });
  }

  if (meeting.kind === "PRIVATE") {
    const isHost = meeting.createdById === session.user.id;
    const isInvitee = meeting.invitedUserId === session.user.id;
    if (!isHost && !isInvitee && session.user.role !== "ADMIN") {
      return Response.json({ error: "Not authorized for this private session" }, { status: 403 });
    }
  } else if (session.user.status !== "APPROVED" && session.user.role !== "ADMIN") {
    return Response.json({ error: "Account not approved" }, { status: 403 });
  }

  const block = await prisma.blockList.findFirst({
    where: { userId: session.user.id, unblockedAt: null },
  });
  if (block) {
    return Response.json({ error: "You are blocked from meetings" }, { status: 403 });
  }

  const isHost = session.user.id === meeting.createdById;

  if (isHost && meeting.status === "SCHEDULED") {
    meeting = await prisma.meeting.update({
      where: { id: meeting.id },
      data: { status: "LIVE", startedAt: new Date() },
    });
  }

  if (meeting.status !== "LIVE" && session.user.role !== "ADMIN") {
    if (meeting.status === "ENDED") {
      return Response.json({ error: "This meeting has ended" }, { status: 410 });
    }
    return Response.json({ error: "Meeting is not live yet" }, { status: 403 });
  }

  if (!session.user.name) {
    return Response.json({ error: "Complete your profile first" }, { status: 400 });
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });

  await prisma.meetingParticipant.upsert({
    where: {
      meetingId_userId: { meetingId: meeting.id, userId: session.user.id },
    },
    update: { blocked: false },
    create: { meetingId: meeting.id, userId: session.user.id },
  });

  await clearKickSignalsForUser(session.user.id, meeting.id);

  const roomKind = meeting.kind === "PRIVATE" ? "private" : "livestream";
  const roomName = liveKitRoomName(token, roomKind);

  const accessToken = await createLiveKitAccessToken({
    roomName,
    identity: session.user.id,
    name: session.user.name,
    avatarUrl: userRecord?.avatarUrl ?? session.user.avatarUrl ?? null,
    isHost,
    memberVideoEnabled: meeting.memberVideoEnabled,
    memberMicEnabled: meeting.memberMicEnabled,
  });

  return Response.json({
    token: accessToken,
    serverUrl,
    roomName,
    isHost,
  });
}
