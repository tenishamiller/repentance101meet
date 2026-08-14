import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { visibleUserFilter } from "@/lib/user-deletion";
import { nextMembershipThreadSeq } from "@/lib/message-thread-deletion";
import { QUESTIONNAIRE_RETAKE_MESSAGE } from "@/lib/onboarding";

export async function memberHasOpenQuestionnaire(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      questionnaireRetakeRequestedAt: true,
      questionnaireCompletedAt: true,
    },
  });
  if (!user) return false;
  if (user.questionnaireRetakeRequestedAt) return true;

  const latestRetake = await prisma.membershipMessage.findFirst({
    where: { threadUserId: userId, type: "QUESTIONNAIRE_RETAKE" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!latestRetake) return false;
  if (!user.questionnaireCompletedAt) return true;
  return latestRetake.createdAt > user.questionnaireCompletedAt;
}

export async function sendQuestionnaireRetakeRequest(adminId: string, userId: string) {
  const member = await prisma.user.findFirst({
    where: { id: userId, role: "MEMBER", ...visibleUserFilter() },
    select: { id: true, name: true },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  const now = new Date();
  const threadSeq = await nextMembershipThreadSeq(userId);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        questionnaireRetakeRequestedAt: now,
        questionnaireAnswers: Prisma.DbNull,
        questionnaireCompletedAt: null,
      },
    }),
    prisma.membershipMessage.create({
      data: {
        threadUserId: userId,
        senderId: adminId,
        type: "QUESTIONNAIRE_RETAKE",
        content: QUESTIONNAIRE_RETAKE_MESSAGE,
        threadSeq,
      },
    }),
  ]);

  return { userId, name: member.name };
}
