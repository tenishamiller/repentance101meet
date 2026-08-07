import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "ADMIN") {
    return Response.json({ error: "Admin account cannot be deleted" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: session.user.id } });

  return Response.json({ success: true });
}
