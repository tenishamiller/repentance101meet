import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { visibleUserFilter } from "@/lib/user-deletion";
import { QUESTIONNAIRE_RETAKE_MESSAGE } from "@/lib/onboarding";

export async function sendQuestionnaireRetakeRequest(adminId: string, userId: string) {
  const member = await prisma.user.findFirst({
    where: { id: userId, role: "MEMBER", ...visibleUserFilter() },
    select: { id: true, name: true },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  const now = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: {
      questionnaireRetakeRequestedAt: now,
      questionnaireAnswers: Prisma.DbNull,
      questionnaireCompletedAt: null,
    },
  });

  await prisma.membershipMessage.create({
    data: {
      threadUserId: userId,
      senderId: adminId,
      type: "QUESTIONNAIRE_RETAKE",
      content: QUESTIONNAIRE_RETAKE_MESSAGE,
    },
  });

  return { userId, name: member.name };
}
