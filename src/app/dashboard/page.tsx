import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (session.user.status === "PENDING" && session.user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-serif text-3xl font-bold">Membership Pending</h1>
        <p className="mt-4 text-stone-600">
          Hi {session.user.name}, Norman is reviewing your request. You&apos;ll be
          notified once approved.
        </p>
      </div>
    );
  }

  const channels = await prisma.channel.findMany({ orderBy: { name: "asc" } });
  const memberships = session.user.role === "ADMIN"
    ? []
    : await prisma.channelMembership.findMany({
        where: { userId: session.user.id },
      });

  const membershipMap = new Map(memberships.map((m) => [m.channelId, m.status]));

  const privateChannels = channels.filter((c) => c.type !== "PUBLIC");
  const liveMeeting = await prisma.meeting.findFirst({
    where: { status: "LIVE" },
    orderBy: { startedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-serif text-3xl font-bold">
        Welcome, {session.user.name}
      </h1>
      <p className="mt-2 text-stone-600">
        {session.user.role === "ADMIN"
          ? "Admin dashboard — manage your ministry from the Admin Console."
          : "Your Repentance 101 member dashboard."}
      </p>

      {liveMeeting && (
        <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6">
          <p className="font-semibold text-green-900">Live Meeting in Progress</p>
          <p className="mt-1 text-green-800">{liveMeeting.title}</p>
          <Link
            href={`/meeting/${liveMeeting.linkToken}`}
            className="mt-4 inline-block rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
          >
            Join Meeting
          </Link>
        </div>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {privateChannels.map((channel) => {
          const status = membershipMap.get(channel.id);
          const isAdmin = session.user.role === "ADMIN";
          const isApproved = isAdmin || status === "APPROVED";

          return (
            <div
              key={channel.id}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold">{channel.name}</h2>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                  {channel.type === "GENERAL" ? "Chat" : "Private"}
                </span>
              </div>
              <p className="text-sm text-stone-600">{channel.description}</p>

              {isAdmin || isApproved ? (
                <Link
                  href={`/channels/${channel.slug}`}
                  className="mt-4 inline-block text-sm font-medium text-amber-700 hover:underline"
                >
                  Enter Channel →
                </Link>
              ) : status === "PENDING" ? (
                <p className="mt-4 text-sm text-amber-700">
                  Join request pending Norman&apos;s approval
                </p>
              ) : status === "DENIED" ? (
                <p className="mt-4 text-sm text-red-600">
                  Request denied. Contact Norman if you believe this was an error.
                </p>
              ) : (
                <Link
                  href={`/channels/${channel.slug}`}
                  className="mt-4 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
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
          <Link
            href="/admin"
            className="inline-flex rounded-xl bg-stone-900 px-6 py-3 font-semibold text-white hover:bg-stone-800"
          >
            Open Admin Console →
          </Link>
        </div>
      )}
    </div>
  );
}
