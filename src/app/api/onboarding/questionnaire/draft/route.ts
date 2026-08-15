import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { memberHasOpenQuestionnaire } from "@/lib/questionnaire-retake";
import {
  draftHasProgress,
  emptyQuestionnaireDraft,
  parseQuestionnaireDraft,
  questionnaireDraftSchema,
} from "@/lib/questionnaire-draft";

async function canEditDraft(userId: string, role: string, status: string, completedAt: Date | null) {
  if (role !== "MEMBER") return false;
  if (!completedAt) return true;
  return memberHasOpenQuestionnaire(userId) || status === "PENDING";
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      status: true,
      questionnaireCompletedAt: true,
      questionnaireAnswers: true,
    },
  });

  if (!user) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (
    !(await canEditDraft(
      session.user.id,
      user.role,
      user.status,
      user.questionnaireCompletedAt,
    ))
  ) {
    return Response.json({ draft: emptyQuestionnaireDraft(), hasProgress: false });
  }

  // Completed answers are not a draft — only restore when still incomplete.
  if (user.questionnaireCompletedAt) {
    return Response.json({ draft: emptyQuestionnaireDraft(), hasProgress: false });
  }

  const draft = parseQuestionnaireDraft(user.questionnaireAnswers) ?? emptyQuestionnaireDraft();
  return Response.json({
    draft,
    hasProgress: draftHasProgress(draft),
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      status: true,
      questionnaireCompletedAt: true,
    },
  });

  if (!user) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (
    !(await canEditDraft(
      session.user.id,
      user.role,
      user.status,
      user.questionnaireCompletedAt,
    ))
  ) {
    return Response.json({ error: "Questionnaire not open for editing" }, { status: 400 });
  }

  if (user.questionnaireCompletedAt) {
    return Response.json({ error: "Questionnaire already completed" }, { status: 400 });
  }

  let draft;
  try {
    draft = questionnaireDraftSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid draft" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      questionnaireAnswers: draft,
    },
  });

  return Response.json({ success: true, hasProgress: draftHasProgress(draft) });
}
