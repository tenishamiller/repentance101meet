import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MINISTRY_NAME } from "@/lib/brand";
import { BrandDivider } from "@/components/BrandDivider";
import { LiveMeetingBanner } from "@/components/livestream/LiveMeetingBanner";
import { UpcomingMeetingsList } from "@/components/livestream/UpcomingMeetingsList";
import { Radio } from "lucide-react";

export async function MobileLivestreamHub() {
  const session = await auth();
  const base = "/m";
  const isApproved =
    session?.user?.status === "APPROVED" || session?.user?.role === "ADMIN";

  const liveMeeting = await prisma.meeting.findFirst({
    where: { status: "LIVE", kind: "LIVESTREAM", deletedAt: null },
    orderBy: { startedAt: "desc" },
  });

  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      kind: "LIVESTREAM",
      status: { in: ["SCHEDULED", "LIVE"] },
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="px-4 py-5">
      <div className="flex items-center gap-2">
        <Radio className="h-6 w-6 text-burgundy" />
        <h1 className="font-serif text-2xl font-bold text-burgundy">Livestream</h1>
      </div>
      <BrandDivider className="my-3 max-w-xs" />
      <p className="text-sm text-burgundy/70">
        Join {MINISTRY_NAME} live teachings from your phone.
      </p>

      {isApproved && liveMeeting && (
        <LiveMeetingBanner
          className="mt-5"
          joinHref={`${base}/meeting/${liveMeeting.linkToken}`}
          initialLive={{ title: liveMeeting.title, linkToken: liveMeeting.linkToken }}
        />
      )}

      {!session && (
        <div className="mt-5 rounded-2xl border border-gold/30 bg-gold/10 p-4">
          <p className="font-semibold text-burgundy">Members only</p>
          <p className="mt-1 text-sm text-burgundy/70">
            Sign in or join to enter the live meeting room when a stream is active.
          </p>
          <div className="mt-3 flex gap-2">
            <Link href={`${base}/login`} className="btn-primary flex-1 text-center text-sm">
              Login
            </Link>
            <Link href={`${base}/signup`} className="btn-outline-gold flex-1 text-center text-sm">
              Join
            </Link>
          </div>
        </div>
      )}

      {session && !isApproved && (
        <div className="mt-5 rounded-2xl border border-gold/30 bg-gold/10 p-4">
          <p className="font-semibold text-burgundy">Membership pending</p>
          <p className="mt-1 text-sm text-burgundy/70">
            Check your messages for onboarding updates from Norman.
          </p>
          <Link href={`${base}/messages`} className="btn-primary mt-3 inline-block text-sm">
            Open Messages
          </Link>
        </div>
      )}

      <div className="mt-6">
        <UpcomingMeetingsList meetings={upcomingMeetings} />
      </div>
    </div>
  );
}
