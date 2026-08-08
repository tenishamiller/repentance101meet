import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logMemberActivity } from "@/lib/member-activity";
import {
  computeOnboardingDueAt,
  questionnaireSchema,
} from "@/lib/onboarding";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      questionnaireCompletedAt: true,
      onboardingDueAt: true,
      status: true,
    },
  });

  if (!user) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    questionnaireCompleted: Boolean(user.questionnaireCompletedAt),
    onboardingDueAt: user.onboardingDueAt?.toISOString() ?? null,
    status: user.status,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "MEMBER" || session.user.status !== "PENDING") {
    return Response.json({ error: "Questionnaire not required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const answers = questionnaireSchema.parse(body);

    if (
      answers.jesusLoveSelections.includes("(Write your answer)") &&
      !answers.jesusLoveCustom?.trim()
    ) {
      return Response.json(
        { error: "Please write your answer when selecting that option" },
        { status: 400 },
      );
    }

    const now = new Date();
    const dueAt = computeOnboardingDueAt(now);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        questionnaireAnswers: answers,
        questionnaireCompletedAt: now,
        onboardingDueAt: dueAt,
      },
    });

    await logMemberActivity({
      userId: session.user.id,
      type: "QUESTIONNAIRE_COMPLETED",
      label: "Completed membership questionnaire",
    });

    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admin) {
      await prisma.membershipMessage.create({
        data: {
          threadUserId: session.user.id,
          senderId: session.user.id,
          type: "SYSTEM",
          content: `${session.user.name} has completed the membership questionnaire and is waiting for a personal one-on-one with Norman. Please review their answers and send an invite when ready.`,
        },
      });
    }

    return Response.json({
      success: true,
      onboardingDueAt: dueAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Invalid answers" }, { status: 400 });
    }
    return Response.json({ error: "Failed to save questionnaire" }, { status: 500 });
  }
}
