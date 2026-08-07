import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TEACHER_NAME, MINISTRY_NAME } from "@/lib/brand";
import { LivestreamScheduleEditor } from "@/components/LivestreamScheduleEditor";
import { BrandDivider } from "@/components/BrandDivider";
import {
  Calendar,
  LogIn,
  Radio,
  Users,
  Video,
  Clock,
} from "lucide-react";

function renderMarkdown(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("# "))
      return (
        <h2 key={i} className="mb-3 font-serif text-2xl font-bold text-burgundy">
          {line.slice(2)}
        </h2>
      );
    if (line.startsWith("## "))
      return (
        <h3 key={i} className="mb-2 mt-5 font-serif text-lg font-semibold text-burgundy">
          {line.slice(3)}
        </h3>
      );
    if (line.startsWith("### "))
      return (
        <h4 key={i} className="mb-2 mt-3 font-semibold text-burgundy">
          {line.slice(4)}
        </h4>
      );
    if (line.startsWith("- "))
      return (
        <li key={i} className="ml-4 list-disc text-burgundy/90">
          {line.slice(2)}
        </li>
      );
    if (line.startsWith("**") && line.endsWith("**"))
      return (
        <p key={i} className="mb-1 font-semibold text-burgundy">
          {line.replace(/\*\*/g, "")}
        </p>
      );
    if (line.trim() === "") return <br key={i} />;
    return (
      <p key={i} className="mb-2 text-burgundy/90">
        {line}
      </p>
    );
  });
}

export default async function LivestreamPage() {
  const session = await auth();

  const channel = await prisma.channel.findUnique({ where: { slug: "livestream" } });
  const liveMeeting = await prisma.meeting.findFirst({
    where: { status: "LIVE" },
    orderBy: { startedAt: "desc" },
  });
  const upcomingMeetings = await prisma.meeting.findMany({
    where: { status: { in: ["SCHEDULED", "LIVE"] } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const isApproved =
    session?.user?.status === "APPROVED" || session?.user?.role === "ADMIN";
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Live meeting room — main focus */}
      <section className="hero-brand relative overflow-hidden rounded-3xl p-8 text-cream shadow-2xl md:p-12">
        <div className="pointer-events-none absolute -right-10 top-0 h-48 w-48 rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />

        <div className="relative">
          <div className="badge-live mb-4">
            {liveMeeting ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
                </span>
                LIVE NOW
              </>
            ) : (
              <>
                <Radio className="h-4 w-4" />
                Live Meeting Room
              </>
            )}
          </div>

          <h1 className="font-serif text-3xl font-bold md:text-5xl">
            Meet Together with {TEACHER_NAME}
          </h1>
          <BrandDivider light className="my-4 max-w-md" />
          <p className="max-w-2xl text-lg text-cream/90">
            Watch {TEACHER_NAME}&apos;s live teaching — video stream, fellowship chat, and raise your
            hand to participate with the {MINISTRY_NAME} community.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {liveMeeting && isApproved ? (
              <Link href={`/meeting/${liveMeeting.linkToken}`} className="btn-primary inline-flex items-center gap-2 !px-8 !py-4 !text-lg">
                <Video className="h-6 w-6" />
                Join Live Meeting
              </Link>
            ) : liveMeeting && !session ? (
              <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-cream px-8 py-4 text-lg font-bold text-burgundy shadow-lg transition hover:bg-gold-light/30">
                <LogIn className="h-6 w-6" />
                Log In to Join
              </Link>
            ) : liveMeeting && !isApproved ? (
              <div className="rounded-xl border border-gold/40 bg-burgundy-dark/50 px-6 py-4">
                <p className="font-semibold text-gold-light">Membership approval required</p>
                <p className="mt-1 text-sm text-cream/80">
                  {TEACHER_NAME} must approve your account before you can enter the meeting room.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-gold/30 bg-burgundy-dark/40 px-6 py-4 backdrop-blur">
                <p className="flex items-center gap-2 font-semibold">
                  <Clock className="h-5 w-5 text-gold" />
                  No live meeting right now
                </p>
                <p className="mt-1 text-sm text-cream/80">
                  Check the schedule below. {TEACHER_NAME} will start the room from the Admin Console when it&apos;s time.
                </p>
              </div>
            )}

            {isAdmin && (
              <Link href="/admin" className="btn-secondary inline-flex items-center gap-2 !px-6 !py-4">
                Start Meeting (Admin)
              </Link>
            )}
          </div>

          {liveMeeting && (
            <p className="mt-4 text-sm text-gold-light/80">
              Current session: <strong className="text-cream">{liveMeeting.title}</strong>
            </p>
          )}
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        {/* Schedule */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gold-muted" />
            <h2 className="font-serif text-2xl font-bold text-burgundy">Schedule & Information</h2>
          </div>

          {isAdmin && channel ? (
            <LivestreamScheduleEditor
              channelSlug="livestream"
              initialContent={channel.content ?? ""}
            />
          ) : (
            <div className="card-brand prose-ministry p-8">
              {renderMarkdown(channel?.content ?? "Schedule coming soon.")}
            </div>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="card-brand p-6">
            <h3 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-burgundy">
              <Users className="h-5 w-5 text-gold-muted" />
              How to Join
            </h3>
            <ol className="space-y-3 text-sm text-burgundy/80">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-burgundy text-xs font-bold text-gold-light">
                  1
                </span>
                Create an account and get approved by {TEACHER_NAME}
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-burgundy text-xs font-bold text-gold-light">
                  2
                </span>
                Come to this page when a meeting is LIVE
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-burgundy text-xs font-bold text-gold-light">
                  3
                </span>
                Click <strong className="text-burgundy">Join Live Meeting</strong> — watch the stream & chat along
              </li>
            </ol>
          </div>

          {upcomingMeetings.length > 0 && (
            <div className="card-brand p-6">
              <h3 className="mb-3 font-serif text-lg font-semibold text-burgundy">Sessions</h3>
              <ul className="space-y-3">
                {upcomingMeetings.map((m) => (
                  <li key={m.id} className="rounded-xl bg-cream-dark px-4 py-3 text-sm">
                    <p className="font-medium text-burgundy">{m.title}</p>
                    <p className="mt-0.5 text-burgundy/60">
                      {m.status === "LIVE" ? (
                        <span className="font-semibold text-gold-muted">● Live now</span>
                      ) : (
                        "Scheduled — waiting for Norman to start"
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!session && (
            <div className="hero-brand rounded-2xl p-6 shadow-md">
              <p className="font-semibold text-cream">New here?</p>
              <p className="mt-1 text-sm text-gold-light/90">
                Request membership to join live teachings with the community.
              </p>
              <Link href="/signup" className="btn-primary mt-4 inline-block !px-4 !py-2 text-sm">
                Join Ministry
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
