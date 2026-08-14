import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ messageId: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "MEMBER" || session.user.status !== "APPROVED") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { messageId } = await params;
  const message = await prisma.memberDirectMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (message.senderId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.memberDirectMessage.delete({ where: { id: messageId } });
  return Response.json({ success: true });
}
