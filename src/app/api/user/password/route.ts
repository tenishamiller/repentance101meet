import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!currentPassword || !newPassword) {
    return Response.json({ error: "Current and new password are required" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return Response.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  if (confirmPassword && confirmPassword !== newPassword) {
    return Response.json({ error: "New password and confirmation do not match" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return Response.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const samePassword = await bcrypt.compare(newPassword, user.passwordHash);
  if (samePassword) {
    return Response.json(
      { error: "New password must be different from your current password" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return Response.json({ success: true });
}
