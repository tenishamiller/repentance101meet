import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertApprovedMember, getDmRelation } from "@/lib/member-dm";

const schema = z.object({
  userId: z.string().min(1),
  action: z.enum(["cancel"]).optional(),
});

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

  if (body.action === "cancel") {
    const result = await prisma.memberDmRequest.deleteMany({
      where: { fromUserId: meId, toUserId: body.userId, status: "PENDING" },
    });
    if (result.count === 0) {
      return Response.json({ error: "No pending request to cancel." }, { status: 400 });
    }
    return Response.json({ ok: true, cancelled: true });
  }

  const other = await assertApprovedMember(body.userId);
  if (!other) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  const relation = await getDmRelation(meId, body.userId);
  if (relation.blockedByMe || relation.blockedMe) {
    return Response.json({ error: "You cannot request this member." }, { status: 403 });
  }
  if (relation.canMessage) {
    return Response.json({ ok: true, alreadyApproved: true });
  }
  if (relation.pendingIncoming) {
    await prisma.memberDmRequest.update({
      where: { fromUserId_toUserId: { fromUserId: body.userId, toUserId: meId } },
      data: { status: "APPROVED" },
    });
    return Response.json({ ok: true, approved: true });
  }

  await prisma.memberDmRequest.upsert({
    where: { fromUserId_toUserId: { fromUserId: meId, toUserId: body.userId } },
    create: { fromUserId: meId, toUserId: body.userId, status: "PENDING" },
    update: { status: "PENDING" },
  });

  return Response.json({ ok: true, pending: true });
}
