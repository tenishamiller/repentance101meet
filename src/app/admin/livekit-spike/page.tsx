import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LiveKitSpikeClient } from "@/components/livekit/LiveKitSpikeClient";
import { getLiveKitConfig } from "@/lib/livekit-server";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

/** Admin-only LiveKit test room — not linked in nav. */
export default async function LiveKitSpikePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  if (!getLiveKitConfig()) {
    return (
      <div className="container-app py-10">
        <p className="text-burgundy">
          LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET to
          .env.local.
        </p>
      </div>
    );
  }

  const { token: meetingToken } = await searchParams;
  if (!meetingToken) {
    const live = await prisma.meeting.findFirst({
      where: { kind: "LIVESTREAM", status: "LIVE", deletedAt: null },
      orderBy: { startedAt: "desc" },
      select: { linkToken: true, title: true },
    });

    return (
      <div className="container-app py-10">
        <h1 className="font-serif text-2xl font-bold text-burgundy">LiveKit spike</h1>
        <p className="mt-2 text-burgundy/70">
          Add{" "}
          <code className="rounded bg-burgundy/10 px-1.5 py-0.5 text-sm">
            ?token=MEETING_LINK_TOKEN
          </code>{" "}
          to test a specific livestream.
        </p>
        {live ? (
          <p className="mt-4 text-sm text-burgundy/80">
            Latest live meeting:{" "}
            <a
              href={`/admin/livekit-spike?token=${live.linkToken}`}
              className="font-semibold text-burgundy underline"
            >
              {live.title}
            </a>
          </p>
        ) : (
          <p className="mt-4 text-sm text-burgundy/60">No live meeting found — start one as host first.</p>
        )}
      </div>
    );
  }

  return (
    <div className="container-app py-6">
      <LiveKitSpikeClient meetingToken={meetingToken} />
    </div>
  );
}
