import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDmRelation } from "@/lib/member-dm";

const schema = z.object({
  userId: z.string().min(1),
  action: z.enum(["approve", "decline"]),
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
  const relation = await getDmRelation(meId, body.userId);
  if (relation.blockedByMe || relation.blockedMe) {
    return Response.json({ error: "You cannot respond to this member." }, { status: 403 });
  }
  if (!relation.pendingIncoming) {
    return Response.json({ error: "No pending request from this member." }, { status: 400 });
  }

  await prisma.memberDmRequest.update({
    where: { fromUserId_toUserId: { fromUserId: body.userId, toUserId: meId } },
    data: { status: body.action === "approve" ? "APPROVED" : "DECLINED" },
  });

  return Response.json({ ok: true });
}
