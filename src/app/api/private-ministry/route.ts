import { NextRequest } from "next/server";
import { getActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const authz = await getActiveSession();
  if (authz.unauthorized) return authz.unauthorized;
  const session = authz.session;

  const isAdmin = session.user.role === "ADMIN";

  if (session.user.status !== "APPROVED" && !isAdmin) {
    const onboardingSessions = await prisma.meeting.findMany({
      where: {
        kind: "PRIVATE",
        isOnboardingApproval: true,
        invitedUserId: session.user.id,
        memberHiddenAt: null,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        invitedUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    return Response.json({ sessions: onboardingSessions, approvedMembers: [], isAdmin: false });
  }

  const sessions = await prisma.meeting.findMany({
    where: isAdmin
      ? { kind: "PRIVATE", hostHiddenAt: null, deletedAt: null }
      : { kind: "PRIVATE", invitedUserId: session.user.id, memberHiddenAt: null, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      invitedUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  let approvedMembers: { id: string; name: string; email: string; avatarUrl: string | null }[] =
    [];

  if (isAdmin) {
    approvedMembers = await prisma.user.findMany({
      where: { status: "APPROVED", role: "MEMBER" },
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: { name: "asc" },
    });
  }

  return Response.json({ sessions, approvedMembers, isAdmin });
}

export async function POST(request: NextRequest) {
  const authz = await getActiveSession();
  if (authz.unauthorized) return authz.unauthorized;
  const session = authz.session;
  if (session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { title, invitedUserId } = body as { title?: string; invitedUserId?: string };

  if (!invitedUserId) {
    return Response.json({ error: "Select a member to invite" }, { status: 400 });
  }

  const member = await prisma.user.findFirst({
    where: { id: invitedUserId, status: "APPROVED" },
  });

  if (!member) {
    return Response.json({ error: "Member not found or not approved" }, { status: 400 });
  }

  const linkToken = uuidv4().replace(/-/g, "").slice(0, 16);
  const roomId = `repentance101-private-${linkToken}`;

  const privateSession = await prisma.meeting.create({
    data: {
      title: title?.trim() || `Personal time with ${member.name}`,
      linkToken,
      kind: "PRIVATE",
      livekitRoom: roomId,
      createdById: session.user.id,
      invitedUserId: member.id,
      status: "SCHEDULED",
    },
    include: {
      invitedUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  const appUrl = getAppUrl();

  return Response.json({
    session: privateSession,
    joinUrl: `${appUrl}/personal-ministry/${linkToken}`,
  });
}

export async function PATCH(request: NextRequest) {
  const authz = await getActiveSession();
  if (authz.unauthorized) return authz.unauthorized;
  const session = authz.session;

  const body = await request.json().catch(() => ({}));
  const { sessionId, action } = body as { sessionId?: string; action?: string };
  if (!sessionId || !action) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const privateSession = await prisma.meeting.findFirst({
    where: { id: sessionId, kind: "PRIVATE", deletedAt: null },
  });

  if (!privateSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isInvitee = privateSession.invitedUserId === session.user.id;

  if (action === "start" || action === "end") {
    if (!isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "start") {
      const updated = await prisma.meeting.update({
        where: { id: sessionId },
        data: { status: "LIVE", startedAt: new Date() },
      });
      return Response.json({ session: updated });
    }

    await prisma.meetingSignal.create({
      data: {
        meetingId: privateSession.id,
        fromUserId: session.user.id,
        toUserId: null,
        type: "host-ended",
        payload: {},
      },
    });

    const updated = await prisma.meeting.update({
      where: { id: sessionId },
      data: { status: "ENDED", endedAt: new Date() },
    });
    return Response.json({
      session: updated,
      requiresOnboardingDecision: privateSession.isOnboardingApproval,
      invitedUserId: privateSession.invitedUserId,
    });
  }

  if (action === "hide") {
    if (privateSession.status === "LIVE") {
      return Response.json(
        { error: "End the session before removing it from your log" },
        { status: 400 },
      );
    }

    if (isAdmin) {
      const updated = await prisma.meeting.update({
        where: { id: sessionId },
        data: { hostHiddenAt: new Date() },
      });
      return Response.json({ session: updated });
    }

    if (isInvitee) {
      const updated = await prisma.meeting.update({
        where: { id: sessionId },
        data: { memberHiddenAt: new Date() },
      });
      return Response.json({ session: updated });
    }

    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
