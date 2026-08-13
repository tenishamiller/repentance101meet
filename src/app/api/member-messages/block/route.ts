import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MEMBER" || session.user.status !== "APPROVED") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const meId = session.user.id;
  if (body.userId === meId) {
    return Response.json({ error: "Invalid member" }, { status: 400 });
  }

  const existing = await prisma.memberDmBlock.findUnique({
    where: { blockerId_blockedId: { blockerId: meId, blockedId: body.userId } },
  });

  if (existing) {
    await prisma.memberDmBlock.delete({ where: { id: existing.id } });
    return Response.json({ ok: true, blocked: false });
  }

  await prisma.$transaction([
    prisma.memberDmBlock.create({
      data: { blockerId: meId, blockedId: body.userId },
    }),
    prisma.memberDmRequest.updateMany({
      where: {
        OR: [
          { fromUserId: meId, toUserId: body.userId },
          { fromUserId: body.userId, toUserId: meId },
        ],
        status: { in: ["PENDING", "APPROVED"] },
      },
      data: { status: "REMOVED" },
    }),
  ]);

  return Response.json({ ok: true, blocked: true });
}
