import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
    },
  });

  if (!user) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    questionnaireCompleted: Boolean(user.questionnaireCompletedAt),
    questionnaireRetakeRequested: Boolean(user.questionnaireRetakeRequestedAt),
    onboardingDueAt: user.onboardingDueAt?.toISOString() ?? null,
    status: user.status,
  });
}
