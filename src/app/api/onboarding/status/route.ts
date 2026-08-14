import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { memberHasOpenQuestionnaire } from "@/lib/questionnaire-retake";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      questionnaireCompletedAt: true,
      questionnaireRetakeRequestedAt: true,
      onboardingDueAt: true,
      status: true,
      role: true,
    },
  });

  if (!user) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const questionnaireRetakeRequested =
    user.role === "MEMBER" ? await memberHasOpenQuestionnaire(session.user.id) : false;

  return Response.json({
    questionnaireCompleted: Boolean(user.questionnaireCompletedAt),
    questionnaireRetakeRequested,
    onboardingDueAt: user.onboardingDueAt?.toISOString() ?? null,
    status: user.status,
    role: user.role,
  });
}
