import Link from "next/link";
import { MINISTRY_NAME, MINISTRY_LEADER } from "@/lib/brand";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BrandDivider } from "@/components/BrandDivider";
import { LiveMeetingBanner } from "@/components/livestream/LiveMeetingBanner";
import { formatRequestDateTime, getChannelPublicDescription } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (session.user.status === "PENDING" && session.user.role !== "ADMIN") {
    redirect(session.user.questionnaireCompleted ? "/messages" : "/signup");
  }

  const channels = await prisma.channel.findMany({ orderBy: { name: "asc" } });
  const memberships = session.user.role === "ADMIN"
    ? []
    : await prisma.channelMembership.findMany({
        where: { userId: session.user.id },
        select: { channelId: true, status: true, requestedAt: true },
      });

  const membershipMap = new Map(
    memberships.map((m) => [
      m.channelId,
      { status: m.status, requestedAt: m.requestedAt },
    ]),
  );

  const privateChannels = channels.filter((c) => c.type !== "PUBLIC");
  const liveMeeting = await prisma.meeting.findFirst({
    where: { status: "LIVE", kind: "LIVESTREAM", deletedAt: null },
    orderBy: { startedAt: "desc" },
  });
  const privateInvite = session.user.role !== "ADMIN"
    ? await prisma.meeting.findFirst({
        where: {
          kind: "PRIVATE",
          invitedUserId: session.user.id,
          status: "LIVE",
        },
      })
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-serif text-3xl font-bold text-burgundy">
        Welcome, {session.user.name}
      </h1>
      <BrandDivider className="my-4 max-w-xs" />
      <p className="text-burgundy/70">
        {session.user.role === "ADMIN"
          ? "Admin dashboard — manage your ministry from the Admin Console."
          : "Your Repentance 101 member dashboard."}
      </p>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <Link
          href="/livestream"
          className="card-glow hero-brand flex flex-col items-center justify-between gap-4 rounded-2xl p-6 sm:flex-row"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-light">
              Live Meeting Room
            </p>
            <p className="mt-1 font-serif text-xl font-bold text-cream">
              Meet together live
            </p>
            <p className="mt-1 text-sm text-cream/80">
              Watch live teachings, chat, and fellowship with the community
            </p>
          </div>
          <span className="btn-primary shrink-0">Open Livestream →</span>
        </Link>

        <Link
          href="/missed-it"
          className="card-brand flex flex-col items-center justify-between gap-4 rounded-2xl border-2 border-gold/40 p-6 sm:flex-row"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-muted">
              In case you missed it
            </p>
            <p className="mt-1 font-serif text-xl font-bold text-burgundy">
              This week&apos;s topics
            </p>
            <p className="mt-1 text-sm text-burgundy/70">
              Monday through Friday — what was taught, with links for each day
            </p>
          </div>
          <span className="btn-outline-gold shrink-0">Open planner →</span>
        </Link>

        <Link
          href="/personal-ministry"
          className="card-brand flex flex-col items-center justify-between gap-4 rounded-2xl border-2 border-gold/40 p-6 sm:flex-row"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-muted">
              Personal Ministry
            </p>
            <p className="mt-1 font-serif text-xl font-bold text-burgundy">
              Private one-on-one pastoral care
            </p>
            <p className="mt-1 text-sm text-burgundy/70">
              {session.user.role === "ADMIN"
                ? "Invite members for personal pastoral care"
                : "When you're invited, join here privately"}
            </p>
          </div>
          <span className="btn-outline-gold shrink-0">Open →</span>
        </Link>

        <Link
          href="/settings#change-password"
          className="card-brand flex flex-col items-center justify-between gap-4 rounded-2xl border-2 border-gold/40 p-6 sm:flex-row"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-muted">
              Account Settings
            </p>
            <p className="mt-1 font-serif text-xl font-bold text-burgundy">
              Change your password
            </p>
            <p className="mt-1 text-sm text-burgundy/70">
              Update your login password, profile photo, name, and email
            </p>
          </div>
          <span className="btn-outline-gold shrink-0">Open settings →</span>
        </Link>
      </section>

      {privateInvite && (
        <div className="mt-8 rounded-2xl border-2 border-burgundy/30 bg-burgundy/5 p-6">
          <p className="font-semibold text-burgundy">Private session available</p>
          <p className="mt-1 text-burgundy/80">{privateInvite.title}</p>
          <Link
            href={`/personal-ministry/${privateInvite.linkToken}`}
            className="btn-primary mt-4 inline-block !px-5 !py-2.5 text-sm"
          >
            Join Private Session
          </Link>
        </div>
      )}

      {liveMeeting && (
        <LiveMeetingBanner
          className="mt-8"
          initialLive={{ title: liveMeeting.title, linkToken: liveMeeting.linkToken }}
        />
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {privateChannels.map((channel) => {
          const membership = membershipMap.get(channel.id);
          const status = membership?.status;
          const isAdmin = session.user.role === "ADMIN";
          const isApproved = isAdmin || status === "APPROVED";

          return (
            <div key={channel.id} className="card-brand p-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold text-burgundy">{channel.name}</h2>
                <span className="rounded-full bg-burgundy/10 px-2 py-0.5 text-xs font-medium text-burgundy">
                  {channel.type === "GENERAL" ? "Chat" : "Private"}
                </span>
              </div>
              <p className="text-sm text-burgundy/70">
                {getChannelPublicDescription(channel.slug, channel.description)}
              </p>

              {isAdmin || isApproved ? (
                <Link
                  href={`/channels/${channel.slug}`}
                  className="mt-4 inline-block text-sm font-medium text-gold-muted hover:underline"
                >
                  Enter Channel →
                </Link>
              ) : status === "PENDING" ? (
                <div className="mt-4">
                  <p className="text-sm text-gold-muted">
                    Chat unavailable — pending approval. Speak with {MINISTRY_LEADER}.
                  </p>
                  {membership?.requestedAt && (
                    <p className="mt-1 text-xs text-burgundy/55">
                      Requested {formatRequestDateTime(membership.requestedAt)}
                    </p>
                  )}
                </div>
              ) : status === "DENIED" ? (
                <p className="mt-4 text-sm text-burgundy">
                  Request denied. Contact {MINISTRY_LEADER} if you believe this was an error.
                </p>
              ) : (
                <Link
                  href={`/channels/${channel.slug}`}
                  className="btn-primary mt-4 inline-block !px-4 !py-2 text-sm"
                >
                  Request to Join
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {session.user.role === "ADMIN" && (
        <div className="mt-10">
          <Link href="/admin" className="btn-burgundy inline-flex">
            Open Admin Console →
          </Link>
        </div>
      )}

      <Link
        href="/giving"
        className="card-glow hero-brand mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl p-6 sm:flex-row"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gold-light">Give</p>
          <p className="mt-1 font-serif text-xl font-bold text-cream">Support the ministry</p>
          <p className="mt-1 text-sm text-cream/80">
            A one-time or monthly gift helps keep teaching and fellowship going.
          </p>
        </div>
        <span className="btn-primary shrink-0">Give →</span>
      </Link>
    </div>
  );
}
