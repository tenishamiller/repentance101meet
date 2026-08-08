import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildRecordingFilename, RECORDING_CONTENT_TYPE } from "@/lib/recording";

type RouteParams = { params: Promise<{ meetingId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { meetingId } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { id: true, title: true, recordingUrl: true, kind: true },
  });

  if (!meeting?.recordingUrl) {
    return Response.json({ error: "Recording not found" }, { status: 404 });
  }

  const upstream = await fetch(meeting.recordingUrl);
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: "Could not fetch recording file" }, { status: 502 });
  }

  const filename = buildRecordingFilename(meeting.title);

  return new Response(upstream.body, {
    headers: {
      "Content-Type": RECORDING_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
