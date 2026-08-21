import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100).optional(),
  email: z.string().trim().email("Enter a valid email").optional(),
  avatarUrl: z.string().nullable().optional(),
  currentPassword: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  const authz = await getActiveSession();
  if (authz.unauthorized) return authz.unauthorized;
  const session = authz.session;

  let body: z.infer<typeof profileSchema>;
  try {
    body = profileSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Invalid profile" },
        { status: 400 },
      );
    }
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const nextEmail = body.email ? body.email.toLowerCase() : undefined;
  const emailChanging = Boolean(nextEmail && nextEmail !== session.user.email);

  if (emailChanging) {
    const currentPassword = body.currentPassword ?? "";
    if (!currentPassword) {
      return Response.json(
        { error: "Enter your current password to change email" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
    if (!existingUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPassword, existingUser.passwordHash);
    if (!valid) {
      return Response.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: nextEmail },
    });
    if (existing && existing.id !== session.user.id) {
      return Response.json({ error: "Email already in use" }, { status: 400 });
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: body.name,
        email: nextEmail,
        avatarUrl: body.avatarUrl === undefined ? undefined : body.avatarUrl,
      },
    });

    return Response.json({
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "Email already in use" }, { status: 400 });
    }
    throw error;
  }
}
