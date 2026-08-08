import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { logMemberActivity } from "@/lib/member-activity";
import {
  ONBOARDING_DUE_HOURS,
  ONBOARDING_INVITE_MESSAGE,
  ONBOARDING_INVITE_TITLE,
} from "@/lib/onboarding";
import { v4 as uuidv4 } from "uuid";

export async function sendOnboardingInvite(adminId: string, userId: string) {
  const member = await prisma.user.findFirst({
    where: { id: userId, status: "PENDING", role: "MEMBER" },
  });

  if (!member) {
    throw new Error("Pending member not found");
  }

  if (!member.questionnaireCompletedAt) {
    throw new Error("Member has not completed the questionnaire yet");
  }

  const existingLive = await prisma.meeting.findFirst({
    where: {
      invitedUserId: userId,
      isOnboardingApproval: true,
      status: { in: ["SCHEDULED", "LIVE"] },
      deletedAt: null,
    },
  });

  if (existingLive) {
    throw new Error("An onboarding meeting is already scheduled for this member");
  }

  const linkToken = uuidv4().replace(/-/g, "").slice(0, 16);
  const roomId = `repentance101-onboarding-${linkToken}`;

  const meeting = await prisma.meeting.create({
    data: {
      title: ONBOARDING_INVITE_TITLE,
      linkToken,
      kind: "PRIVATE",
      livekitRoom: roomId,
      createdById: adminId,
      invitedUserId: userId,
      isOnboardingApproval: true,
      status: "SCHEDULED",
    },
  });

  const joinUrl = `${getAppUrl()}/personal-ministry/${linkToken}`;

  await prisma.membershipMessage.create({
    data: {
      threadUserId: userId,
      senderId: adminId,
      type: "ONBOARDING_INVITE",
      meetingId: meeting.id,
      content: `${ONBOARDING_INVITE_MESSAGE}\n\nJoin link: ${joinUrl}`,
    },
  });

  await logMemberActivity({
    userId,
    type: "ONBOARDING_INVITE_SENT",
    actorId: adminId,
    meetingId: meeting.id,
    label: "Norman sent membership approval one-on-one invite",
  });

  return { meeting, joinUrl };
}

export async function approvePendingMember(adminId: string, userId: string, meetingId?: string) {
  const user = await prisma.user.update({
    where: { id: userId, status: "PENDING" },
    data: { status: "APPROVED" },
  });

  await logMemberActivity({
    userId,
    type: "MEMBERSHIP_APPROVED",
    actorId: adminId,
    meetingId: meetingId ?? undefined,
    label: "Approved after personal one-on-one with Norman",
  });

  await prisma.membershipMessage.create({
    data: {
      threadUserId: userId,
      senderId: adminId,
      type: "SYSTEM",
      content:
        "Congratulations — Norman has approved your membership. You now have full access to Repentance 101. Welcome to the group!",
    },
  });

  return user;
}

export async function denyAndDeleteMember(adminId: string, userId: string, reason?: string) {
  const member = await prisma.user.findFirst({
    where: { id: userId, role: "MEMBER" },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  if (member.role === "ADMIN") {
    throw new Error("Cannot delete admin account");
  }

  await logMemberActivity({
    userId,
    type: "MEMBERSHIP_DENIED",
    actorId: adminId,
    reason: reason ?? "Membership denied",
    label: reason ?? "Membership denied and account removed",
  });

  await prisma.user.delete({ where: { id: userId } });
}
