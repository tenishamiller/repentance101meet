import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  );
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status") ?? "ALL";

  const where: Prisma.UserWhereInput = { role: "MEMBER" };

  if (status !== "ALL") {
    where.status = status as "PENDING" | "APPROVED" | "REJECTED";
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, members] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return Response.json({
    members,
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

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  return Response.json({ user });
}
