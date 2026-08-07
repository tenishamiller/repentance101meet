import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { MINISTRY_NAME, MINISTRY_LEADER } from "@/lib/brand";
import { BrandDivider } from "@/components/BrandDivider";
import {
  BookOpen,
  HandHeart,
  MessageCircle,
  Radio,
  Users,
  Video,
} from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8">
      {/* Hero — logo seal colors */}
      <section className="hero-brand relative overflow-hidden rounded-3xl px-8 py-14 text-cream shadow-2xl md:px-14 md:py-20">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="animate-fade-up">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-light">
              <Radio className="h-3.5 w-3.5" />
              repentance101ministry.com
            </p>
            <h1 className="font-serif text-4xl font-bold leading-tight md:text-6xl">
              {MINISTRY_NAME}
            </h1>
            <BrandDivider light className="my-4 max-w-xs" />
            <p className="text-xl font-medium text-gold-light">
              Biblical teaching & fellowship
            </p>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream/90">
              Live teachings, guided channels, accountability partners, and biblical
              answers to tough questions — a community walking in repentance together.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              {!session ? (
                <>
                  <Link href="/signup" className="btn-primary">
                    Request Membership
                  </Link>
                  <Link href="/login" className="btn-secondary">
                    Member Login
                  </Link>
                </>
              ) : session.user.status === "PENDING" ? (
                <div className="rounded-2xl border border-gold/30 bg-burgundy-dark/50 px-6 py-4 backdrop-blur">
                  <p className="font-semibold text-cream">Welcome, {session.user.name}!</p>
                  <p className="mt-1 text-gold-light">
                    {MINISTRY_LEADER} is reviewing your membership request.
                  </p>
                </div>
              ) : (
                <Link href="/dashboard" className="btn-primary">
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>

          <div className="animate-float mx-auto lg:mx-0">
            <div className="relative">
              <div className="absolute inset-0 scale-110 rounded-full bg-gold/25 blur-2xl" />
              <Image
                src="/brand/repentance101-logo.png"
                alt={`${MINISTRY_NAME} ministry logo`}
                width={240}
                height={240}
                className="relative seal-ring rounded-full ring-offset-burgundy-deep shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Video, label: "Live Meetings", desc: "Live teaching sessions with the community" },
          { icon: HandHeart, label: "Accountability", desc: "Grow together in truth" },
          { icon: MessageCircle, label: "Community Chat", desc: "Connect between meetings" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="card-brand flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-burgundy text-gold-light shadow-md">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-serif font-semibold text-burgundy">{label}</p>
              <p className="text-sm text-burgundy/70">{desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Channels */}
      <section className="mt-16">
        <div className="mb-8 text-center">
          <h2 className="font-serif text-3xl font-bold text-burgundy">Ministry Channels</h2>
          <BrandDivider className="mx-auto mt-4 max-w-xs" />
          <p className="mt-4 text-burgundy/70">
            Explore publicly or join member-only spaces after approval
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Live Meeting Room",
              desc: "Watch live teachings — stream & fellowship chat.",
              href: "/livestream",
              public: true,
              icon: Video,
            },
            {
              title: "Guideline Channel",
              desc: "Public ministry guidelines — visible to everyone.",
              href: "/channels/guidelines",
              public: true,
              icon: BookOpen,
            },
            {
              title: "Livestream Schedule",
              desc: "Times and details for upcoming teachings.",
              href: "/livestream",
              public: true,
              icon: Radio,
            },
            {
              title: "Member Channels",
              desc: "Resources, accountability, tough Q&A, and general chat.",
              href: session?.user?.status === "APPROVED" ? "/dashboard" : "/signup",
              public: false,
              icon: Users,
            },
          ].map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="card-glow card-brand group p-6"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-burgundy to-burgundy-dark text-gold-light shadow-md transition group-hover:scale-105">
                <item.icon className="h-6 w-6" />
              </div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-serif text-xl font-semibold text-burgundy">{item.title}</h3>
                {item.public ? (
                  <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-semibold text-burgundy">
                    Public
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-burgundy/10 px-2.5 py-0.5 text-xs font-semibold text-burgundy">
                    Members
                  </span>
                )}
              </div>
              <p className="text-burgundy/70">{item.desc}</p>
              <p className="mt-4 text-sm font-semibold text-gold-muted group-hover:underline">
                View →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Quote */}
      <section className="mt-16 rounded-3xl border-2 border-gold/30 bg-cream-dark px-8 py-10 text-center shadow-inner">
        <BrandDivider className="mx-auto mb-6 max-w-xs" />
        <p className="font-serif text-2xl italic leading-relaxed text-burgundy md:text-3xl">
          &ldquo;Repent, for the kingdom of heaven is at hand.&rdquo;
        </p>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-gold-muted">
          Matthew 4:17 · {MINISTRY_NAME}
        </p>
        <BrandDivider className="mx-auto mt-6 max-w-xs" />
      </section>
    </div>
  );
}
