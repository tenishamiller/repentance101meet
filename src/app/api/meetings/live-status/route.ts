import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const liveMeeting = await prisma.meeting.findFirst({
    where: { status: "LIVE", kind: "LIVESTREAM", deletedAt: null },
    orderBy: { startedAt: "desc" },
    select: { title: true, linkToken: true, startedAt: true },
  });

  return Response.json({
    live: liveMeeting
      ? {
          title: liveMeeting.title,
          linkToken: liveMeeting.linkToken,
          startedAt: liveMeeting.startedAt?.toISOString() ?? null,
        }
      : null,
  });
}
