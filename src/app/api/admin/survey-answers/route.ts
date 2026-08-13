import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logMemberActivity } from "@/lib/member-activity";
import { computeOnboardingDueAt, questionnaireSchema } from "@/lib/onboarding";
import {
  parseQuestionnaireAnswers,
  rawQuestionnaireToEntries,
  questionnaireToEntries,
} from "@/lib/survey-answers";
import { visibleUserFilter } from "@/lib/user-deletion";

function isDemoMember(email: string) {
  return email.startsWith("demo@");
}

function buildSubmission(member: {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  deletedAt: Date | null;
  questionnaireCompletedAt: Date | null;
  questionnaireAnswers: unknown;
  createdAt: Date;
  recordedByAdmin?: boolean;
}) {
  const hasAnswers = member.questionnaireAnswers != null;
  const completed = Boolean(member.questionnaireCompletedAt);
  const parsed = hasAnswers ? parseQuestionnaireAnswers(member.questionnaireAnswers) : null;
  const entries = parsed
    ? questionnaireToEntries(parsed)
    : hasAnswers
      ? rawQuestionnaireToEntries(member.questionnaireAnswers)
      : [];

  return {
    id: member.id,
    name: member.name,
    email: member.email,
    avatarUrl: member.avatarUrl,
    status: member.status,
    signedUpAt: member.createdAt.toISOString(),
    completedAt: (member.questionnaireCompletedAt ?? member.createdAt).toISOString(),
    isDeleted: member.deletedAt != null,
    recordedByAdmin: member.recordedByAdmin ?? false,
    parseWarning:
      hasAnswers && !parsed
        ? "Saved answers could not be validated — showing raw responses."
        : !hasAnswers && completed
          ? "Marked complete but answers are missing from the database."
          : null,
    answers:
      parsed ??
      (hasAnswers && typeof member.questionnaireAnswers === "object"
        ? (member.questionnaireAnswers as Record<string, unknown>)
        : {}),
    entries,
  };
}

function missingReasonFor(member: {
  status: string;
  membershipThread: { id: string }[];
}) {
  if (member.status === "PENDING") return "pending_signup";
  if (member.membershipThread.length > 0) return "has_messages_no_survey";
  if (member.status === "APPROVED") return "approved_without_survey";
  return "never_submitted";
}

const missingReasonLabel: Record<string, string> = {
  pending_signup: "Signed up but never finished the questionnaire",
  has_messages_no_survey: "Has membership messages but no saved survey",
  approved_without_survey: "Approved without a saved questionnaire",
  never_submitted: "No questionnaire on file",
};

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

  const submissions: ReturnType<typeof buildSubmission>[] = [];
  const incomplete: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    status: string;
    signedUpAt: string;
    isDeleted: boolean;
    hasMembershipThread: boolean;
    missingReason: string;
    missingReasonLabel: string;
  }> = [];

  for (const member of members) {
    if (isDemoMember(member.email)) continue;

    const hasAnswers = member.questionnaireAnswers != null;
    const completed = Boolean(member.questionnaireCompletedAt);

    if (completed || hasAnswers) {
      if (entriesOrCompleted(hasAnswers, completed, member.questionnaireAnswers)) {
        submissions.push(buildSubmission(member));
      }
      continue;
    }

    incomplete.push({
      id: member.id,
      name: member.name,
      email: member.email,
      avatarUrl: member.avatarUrl,
      status: member.status,
      signedUpAt: member.createdAt.toISOString(),
      isDeleted: member.deletedAt != null,
      hasMembershipThread: member.membershipThread.length > 0,
      missingReason: missingReasonFor(member),
      missingReasonLabel: missingReasonLabel[missingReasonFor(member)],
    });
  }

  submissions.sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );

  incomplete.sort(
    (a, b) => new Date(b.signedUpAt).getTime() - new Date(a.signedUpAt).getTime(),
  );

  return Response.json({
    submissions,
    incomplete,
    summary: {
      completedCount: submissions.length,
      incompleteCount: incomplete.length,
      totalMembersChecked: members.filter((m) => !isDemoMember(m.email)).length,
    },
  });
}

function entriesOrCompleted(
  hasAnswers: boolean,
  completed: boolean,
  raw: unknown,
) {
  if (completed) return true;
  if (!hasAnswers) return false;
  const parsed = parseQuestionnaireAnswers(raw);
  if (parsed) return true;
  return rawQuestionnaireToEntries(raw).length > 0;
}

const patchSchema = questionnaireSchema.extend({
  userId: z.string().min(1),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Invalid survey answers" },
        { status: 400 },
      );
    }
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { userId, ...answers } = body;

  const member = await prisma.user.findFirst({
    where: { id: userId, role: "MEMBER", ...visibleUserFilter() },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      status: true,
      deletedAt: true,
      questionnaireCompletedAt: true,
      onboardingDueAt: true,
      createdAt: true,
    },
  });

  if (!member) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  if (
    answers.jesusLoveSelections.includes("(Write your answer)") &&
    !answers.jesusLoveCustom?.trim()
  ) {
    return Response.json(
      { error: "Please write a custom answer when selecting that option." },
      { status: 400 },
    );
  }

  const now = new Date();
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      questionnaireAnswers: answers,
      questionnaireCompletedAt: member.questionnaireCompletedAt ?? now,
      onboardingDueAt: member.onboardingDueAt ?? computeOnboardingDueAt(now),
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      status: true,
      deletedAt: true,
      questionnaireCompletedAt: true,
      questionnaireAnswers: true,
      createdAt: true,
    },
  });

  await logMemberActivity({
    userId,
    type: "QUESTIONNAIRE_COMPLETED",
    actorId: session.user.id,
    label: "Membership questionnaire recorded by admin",
  });

  return Response.json({
    submission: buildSubmission({ ...updated, recordedByAdmin: true }),
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
