import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logMemberActivity } from "@/lib/member-activity";
import {
  activeUserFilter,
  purgeExpiredUsers,
  restoreDeletedUser,
  softDeleteUser,
  visibleUserFilter,
} from "@/lib/user-deletion";
import type { Prisma } from "@/generated/prisma/client";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await purgeExpiredUsers();

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  );
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status") ?? "ALL";

  const where: Prisma.UserWhereInput = { role: "MEMBER" };

  if (status === "REMOVED") {
    where.deletedAt = { not: null };
    where.purgeAt = { gt: new Date() };
  } else {
    Object.assign(where, visibleUserFilter());
    if (status !== "ALL") {
      where.status = status as "PENDING" | "APPROVED" | "REJECTED";
      where.deletedAt = null;
    }
  }

  if (q) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const [total, members] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
        deletedAt: true,
        purgeAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return Response.json({
    members: members.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      deletedAt: m.deletedAt?.toISOString() ?? null,
      purgeAt: m.purgeAt?.toISOString() ?? null,
    })),
    total,
    page,
    limit,
    totalPages,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, status } = await request.json();

  const allowed = ["PENDING", "APPROVED", "REJECTED"];
  if (!allowed.includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { id: userId, role: "MEMBER", deletedAt: null },
  });

  if (!existing) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  const activityType =
    status === "APPROVED"
      ? "MEMBERSHIP_APPROVED"
      : status === "REJECTED"
        ? "MEMBERSHIP_DENIED"
        : null;

  if (activityType) {
    await logMemberActivity({
      userId,
      type: activityType,
      actorId: session.user.id,
      label: status === "APPROVED" ? "Membership approved" : "Membership denied",
    });
  }

  return Response.json({ user });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, action, reason } = await request.json();

  if (!userId || !action) {
    return Response.json({ error: "userId and action required" }, { status: 400 });
  }

  try {
    if (action === "delete") {
      await softDeleteUser(userId, session.user.id, reason);
      return Response.json({ success: true });
    }

    if (action === "restore") {
      await restoreDeletedUser(userId, session.user.id);
      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Action failed" },
      { status: 400 },
    );
  }
}
