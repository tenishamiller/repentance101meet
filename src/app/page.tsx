import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <section className="rounded-3xl bg-gradient-to-br from-amber-700 via-amber-800 to-stone-900 px-8 py-16 text-white shadow-xl md:px-16">
        <p className="mb-4 text-sm uppercase tracking-widest text-amber-200">
          repentance101meet.com
        </p>
        <h1 className="font-serif text-4xl font-bold md:text-6xl">
          Repentance 101
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-amber-50">
          A teaching ministry led by Norman — live meetings, guided channels,
          accountability, and biblical answers to tough questions.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          {!session ? (
            <>
              <Link
                href="/signup"
                className="rounded-xl bg-white px-6 py-3 font-semibold text-amber-900 hover:bg-amber-50"
              >
                Request Membership
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10"
              >
                Member Login
              </Link>
            </>
          ) : session.user.status === "PENDING" ? (
            <div className="rounded-xl bg-white/10 px-6 py-4 backdrop-blur">
              <p className="font-semibold">Welcome, {session.user.name}!</p>
              <p className="mt-1 text-amber-100">
                Norman is reviewing your membership request. You&apos;ll receive
                access once approved.
              </p>
            </div>
          ) : (
            <Link
              href="/dashboard"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-amber-900 hover:bg-amber-50"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      </section>

      <section className="mt-16 grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Guidelines Channel",
            desc: "Public ministry guidelines — visible to everyone.",
            href: "/channels/guidelines",
            public: true,
          },
          {
            title: "Livestream Information",
            desc: "Schedule and details for Norman's live teachings.",
            href: "/channels/livestream",
            public: true,
          },
          {
            title: "Member Channels",
            desc: "Resources, accountability, tough Q&A, and general chat.",
            href: session?.user?.status === "APPROVED" ? "/dashboard" : "/signup",
            public: false,
          },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-amber-300 hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold">{item.title}</h2>
              {item.public ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  Public
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Members
                </span>
              )}
            </div>
            <p className="text-stone-600">{item.desc}</p>
            <p className="mt-4 text-sm font-medium text-amber-700 group-hover:underline">
              View →
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
