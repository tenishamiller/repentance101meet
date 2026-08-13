import { prisma } from "@/lib/db";
import { activeUserFilter } from "@/lib/user-deletion";

export type DmRelation = {
  canMessage: boolean;
  blockedByMe: boolean;
  blockedMe: boolean;
  pendingOutgoing: boolean;
  pendingIncoming: boolean;
  approved: boolean;
};

export async function assertApprovedMember(userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      role: "MEMBER",
      status: "APPROVED",
      ...activeUserFilter(),
    },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  return user;
}

export async function getDmRelation(meId: string, otherId: string): Promise<DmRelation> {
  const [blockByMe, blockMe, outgoing, incoming] = await Promise.all([
    prisma.memberDmBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: meId, blockedId: otherId } },
    }),
    prisma.memberDmBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: otherId, blockedId: meId } },
    }),
    prisma.memberDmRequest.findUnique({
      where: { fromUserId_toUserId: { fromUserId: meId, toUserId: otherId } },
    }),
    prisma.memberDmRequest.findUnique({
      where: { fromUserId_toUserId: { fromUserId: otherId, toUserId: meId } },
    }),
  ]);

  const blockedByMe = Boolean(blockByMe);
  const blockedMe = Boolean(blockMe);
  const approved =
    outgoing?.status === "APPROVED" || incoming?.status === "APPROVED";
  const pendingOutgoing = outgoing?.status === "PENDING";
  const pendingIncoming = incoming?.status === "PENDING";

  return {
    blockedByMe,
    blockedMe,
    pendingOutgoing,
    pendingIncoming,
    approved,
    canMessage: approved && !blockedByMe && !blockedMe,
  };
}

export function pairFilter(meId: string, otherId: string) {
  return {
    OR: [
      { senderId: meId, recipientId: otherId },
      { senderId: otherId, recipientId: meId },
    ],
  };
}
