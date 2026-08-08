import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  approvePendingMember,
  denyAndDeleteMember,
  sendOnboardingInvite,
} from "@/lib/onboarding-actions";
import { z } from "zod";

const userIdSchema = z.object({ userId: z.string() });

export async function POST(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const action = body.action as string;

  try {
    if (action === "start") {
      const { userId } = userIdSchema.parse(body);
      const meeting = await prisma.meeting.findFirst({
        where: {
          invitedUserId: userId,
          isOnboardingApproval: true,
          status: "SCHEDULED",
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });
      if (!meeting) {
        return Response.json({ error: "No scheduled onboarding session found" }, { status: 404 });
      }
      const updated = await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: "LIVE", startedAt: new Date() },
      });
      return Response.json({ session: updated });
    }

    if (action === "invite") {
      const { userId } = z.object({ userId: z.string() }).parse(body);
      const result = await sendOnboardingInvite(session.user.id, userId);
      return Response.json(result);
    }

    if (action === "deny") {
      const { userId, confirm, reason } = z
        .object({
          userId: z.string(),
          confirm: z.literal(true),
          reason: z.string().optional(),
        })
        .parse(body);
      await denyAndDeleteMember(session.user.id, userId, reason);
      return Response.json({ success: true });
    }

    if (action === "decide") {
      const { userId, decision, meetingId } = z
        .object({
          userId: z.string(),
          decision: z.enum(["approve", "deny"]),
          meetingId: z.string().optional(),
        })
        .parse(body);

      if (decision === "approve") {
        await approvePendingMember(session.user.id, userId, meetingId);
        return Response.json({ success: true, decision: "approved" });
      }

      if (!body.confirm) {
        return Response.json(
          { error: "Confirmation required to deny membership" },
          { status: 400 },
        );
      }

      await denyAndDeleteMember(
        session.user.id,
        userId,
        "Denied after personal one-on-one meeting",
      );
      return Response.json({ success: true, decision: "denied" });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
