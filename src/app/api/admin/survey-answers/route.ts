import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  parseQuestionnaireAnswers,
  rawQuestionnaireToEntries,
  questionnaireToEntries,
} from "@/lib/survey-answers";
import { visibleUserFilter } from "@/lib/user-deletion";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      ...visibleUserFilter(),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      status: true,
      deletedAt: true,
      purgeAt: true,
      questionnaireCompletedAt: true,
      questionnaireAnswers: true,
      createdAt: true,
      membershipThread: {
        select: { id: true },
        take: 1,
      },
    },
  });

  const submissions: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    status: string;
    signedUpAt: string;
    completedAt: string;
    isDeleted: boolean;
    parseWarning: string | null;
    answers: Record<string, unknown>;
    entries: { label: string; value: string }[];
  }> = [];

  const incomplete: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    status: string;
    signedUpAt: string;
    hasMembershipThread: boolean;
  }> = [];

  for (const member of members) {
    const hasAnswers = member.questionnaireAnswers != null;
    const completed = Boolean(member.questionnaireCompletedAt);

    if (completed || hasAnswers) {
      const parsed = hasAnswers ? parseQuestionnaireAnswers(member.questionnaireAnswers) : null;
      const entries = parsed
        ? questionnaireToEntries(parsed)
        : hasAnswers
          ? rawQuestionnaireToEntries(member.questionnaireAnswers)
          : [];

      if (entries.length === 0 && !completed) continue;

      submissions.push({
        id: member.id,
        name: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl,
        status: member.status,
        signedUpAt: member.createdAt.toISOString(),
        completedAt: (member.questionnaireCompletedAt ?? member.createdAt).toISOString(),
        isDeleted: member.deletedAt != null,
        parseWarning:
          hasAnswers && !parsed
            ? "Saved answers could not be validated — showing raw responses."
            : !hasAnswers && completed
              ? "Marked complete but answers are missing from the database."
              : null,
        answers: parsed ?? (hasAnswers && typeof member.questionnaireAnswers === "object"
          ? (member.questionnaireAnswers as Record<string, unknown>)
          : {}),
        entries,
      });
      continue;
    }

    if (member.status === "PENDING" || member.membershipThread.length > 0) {
      incomplete.push({
        id: member.id,
        name: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl,
        status: member.status,
        signedUpAt: member.createdAt.toISOString(),
        hasMembershipThread: member.membershipThread.length > 0,
      });
    }
  }

  submissions.sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );

  return Response.json({
    submissions,
    incomplete,
    summary: {
      completedCount: submissions.length,
      incompleteCount: incomplete.length,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const userId = typeof body.userId === "string" ? body.userId : "";
  const confirm = body.confirm === true;

  if (!userId) {
    return Response.json({ error: "Member is required" }, { status: 400 });
  }

  if (!confirm) {
    return Response.json({ error: "Confirmation required" }, { status: 400 });
  }

  const member = await prisma.user.findFirst({
    where: { id: userId, role: "MEMBER" },
    select: { id: true, questionnaireAnswers: true },
  });

  if (!member?.questionnaireAnswers) {
    return Response.json({ error: "Survey answers not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { questionnaireAnswers: Prisma.DbNull },
  });

  return Response.json({ success: true });
}
