import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activeUserFilter } from "@/lib/user-deletion";
import { parseQuestionnaireAnswers } from "@/lib/survey-answers";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      questionnaireCompletedAt: { not: null },
      questionnaireAnswers: { not: Prisma.DbNull },
      ...activeUserFilter(),
    },
    orderBy: { questionnaireCompletedAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      status: true,
      questionnaireCompletedAt: true,
      questionnaireAnswers: true,
      createdAt: true,
    },
  });

  const submissions = members
    .map((member) => {
      const answers = parseQuestionnaireAnswers(member.questionnaireAnswers);
      if (!answers) return null;
      return {
        id: member.id,
        name: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl,
        status: member.status,
        signedUpAt: member.createdAt.toISOString(),
        completedAt: member.questionnaireCompletedAt!.toISOString(),
        answers,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return Response.json({ submissions });
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
