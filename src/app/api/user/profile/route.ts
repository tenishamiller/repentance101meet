import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, avatarUrl } = await request.json();

  if (email && email !== session.user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing && existing.id !== session.user.id) {
      return Response.json({ error: "Email already in use" }, { status: 400 });
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name ?? undefined,
      email: email ? email.toLowerCase() : undefined,
      avatarUrl: avatarUrl ?? undefined,
    },
  });

  return Response.json({
    user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
  });
}
