import { NextRequest } from "next/server";
import { getActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ token: string }> };

async function getMeetingContext(token: string, userId: string) {
  const meeting = await prisma.meeting.findUnique({ where: { linkToken: token } });
  if (!meeting) return { error: "Meeting not found", status: 404 as const };
  if (meeting.deletedAt) return { error: "Meeting not found", status: 404 as const };

  if (meeting.kind === "PRIVATE") {
    const isHost = meeting.createdById === userId;
    const isInvitee = meeting.invitedUserId === userId;
    if (!isHost && !isInvitee) {
      return { error: "Not authorized for this private session", status: 403 as const };
    }
  }

  const participant = await prisma.meetingParticipant.findUnique({
    where: { meetingId_userId: { meetingId: meeting.id, userId } },
  });

  if (participant?.blocked) {
    return { error: "You are blocked from this meeting", status: 403 as const };
  }

  if (!participant) {
    return { error: "Join the meeting first", status: 403 as const };
  }

  return { meeting, participant };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const authz = await getActiveSession();
  if (authz.unauthorized) return authz.unauthorized;
  const session = authz.session;

  const { token } = await params;
  const ctx = await getMeetingContext(token, session.user.id);
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  const since = request.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(since) : new Date(0);

  const signals = await prisma.meetingSignal.findMany({
    where: {
      meetingId: ctx.meeting.id,
      createdAt: { gt: sinceDate },
      OR: [{ toUserId: session.user.id }, { toUserId: null }],
      NOT: { fromUserId: session.user.id },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return Response.json({ signals });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const authz = await getActiveSession();
  if (authz.unauthorized) return authz.unauthorized;
  const session = authz.session;

  const { token } = await params;
  const ctx = await getMeetingContext(token, session.user.id);
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }

  if (ctx.meeting.status !== "LIVE") {
    const isHost = ctx.meeting.createdById === session.user.id;
    const canSignalWhileScheduled =
      ctx.meeting.kind === "PRIVATE" && isHost && ctx.meeting.status === "SCHEDULED";
    if (!canSignalWhileScheduled && session.user.role !== "ADMIN") {
      return Response.json({ error: "Meeting is not live" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => ({}));
  const { type, toUserId, payload } = body as {
    type?: string;
    toUserId?: string | null;
    payload?: unknown;
  };

  if (!type || typeof type !== "string") {
    return Response.json({ error: "Signal type required" }, { status: 400 });
  }

  const signal = await prisma.meetingSignal.create({
    data: {
      meetingId: ctx.meeting.id,
      fromUserId: session.user.id,
      toUserId: toUserId ?? null,
      type,
      payload: payload ?? {},
    },
  });

  return Response.json({ signal });
}
