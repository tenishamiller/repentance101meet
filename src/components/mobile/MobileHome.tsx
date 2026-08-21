import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MINISTRY_NAME, MINISTRY_LEADER } from "@/lib/brand";
import { BrandDivider } from "@/components/BrandDivider";
import { LiveMeetingBanner } from "@/components/livestream/LiveMeetingBanner";
import { formatRequestDateTime } from "@/lib/utils";
import { Heart, HandHeart, MessageCircle, Radio, Settings, Shield, Users } from "lucide-react";

export async function MobileHome() {
  const session = await auth();
  const base = "/m";

  if (!session) {
    return (
      <div className="px-4 py-6">
        <h1 className="font-serif text-2xl font-bold text-burgundy">{MINISTRY_NAME}</h1>
        <BrandDivider className="my-3 max-w-xs" />
        <p className="text-sm text-burgundy/70">
          Join live teachings, fellowship in chat, and grow in biblical repentance.
        </p>
        <div className="mt-6 grid gap-3">
          <Link href={`${base}/signup`} className="btn-primary block text-center">
            Join Ministry
          </Link>
          <Link href={`${base}/login`} className="btn-outline-gold block text-center">
            Member Login
          </Link>
          <Link href={`${base}/livestream`} className="card-brand block p-4">
            <div className="flex items-center gap-3">
              <Radio className="h-5 w-5 text-gold-muted" />
              <span className="font-semibold text-burgundy">Watch Livestream</span>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  const isPending = session.user.status === "PENDING" && session.user.role !== "ADMIN";
  const isAdmin = session.user.role === "ADMIN";

  const liveMeeting = await prisma.meeting.findFirst({
    where: { status: "LIVE", kind: "LIVESTREAM", deletedAt: null },
    orderBy: { startedAt: "desc" },
  });

  const privateInvite =
    !isAdmin
      ? await prisma.meeting.findFirst({
          where: {
            kind: "PRIVATE",
            invitedUserId: session.user.id,
            status: "LIVE",
          },
        })
      : null;

  const memberSince =
    isPending && !isAdmin
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { createdAt: true },
        })
      : null;

  const tiles = isPending
    ? [
        {
          href: `${base}/messages`,
          label: "Messages",
          desc: "Membership updates from Norman",
          icon: MessageCircle,
        },
        {
          href: `${base}/settings`,
          label: "Settings",
          desc: "Password, photo & account",
          icon: Settings,
        },
      ]
    : [
        {
          href: `${base}/livestream`,
          label: "Live Meeting",
          desc: "Watch & chat with the community",
          icon: Radio,
        },
        {
          href: `${base}/channels`,
          label: "Member Chat",
          desc: "Accountability, Q&A, and fellowship",
          icon: Users,
        },
        {
          href: `${base}/personal-ministry`,
          label: "Personal Ministry",
          desc: "Private pastoral care",
          icon: Heart,
        },
        {
          href: `${base}/settings`,
          label: "Settings",
          desc: "Password, photo & account",
          icon: Settings,
        },
        ...(isAdmin
          ? [
              {
                href: `${base}/admin`,
                label: "Admin",
                desc: "Manage ministry",
                icon: Shield,
              },
            ]
          : []),
        {
          href: `${base}/giving`,
          label: "Give",
          desc: "Support the ministry",
          icon: HandHeart,
        },
      ];

  return (
    <div className="px-4 py-5">
      <h1 className="font-serif text-2xl font-bold text-burgundy">
        Welcome, {session.user.name}
      </h1>
      <BrandDivider className="my-3 max-w-xs" />
      <p className="text-sm text-burgundy/70">
        {isPending
          ? `Complete your onboarding with ${MINISTRY_LEADER}.`
          : isAdmin
            ? "Ministry admin — quick access below."
            : "Your mobile member hub."}
      </p>

      {liveMeeting && !isPending && (
        <LiveMeetingBanner
          className="mt-5"
          joinHref={`${base}/meeting/${liveMeeting.linkToken}`}
          initialLive={{ title: liveMeeting.title, linkToken: liveMeeting.linkToken }}
        />
      )}

      {privateInvite && (
        <Link
          href={`${base}/personal-ministry/${privateInvite.linkToken}`}
          className="mt-4 block rounded-2xl border-2 border-burgundy/30 bg-burgundy/5 p-4"
        >
          <p className="font-semibold text-burgundy">Private session live</p>
          <p className="text-sm text-burgundy/70">{privateInvite.title}</p>
        </Link>
      )}

      <div className="mt-5 grid gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className="card-brand flex items-center gap-4 p-4 active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-burgundy/10">
                <Icon className="h-5 w-5 text-burgundy" />
              </div>
              <div>
                <p className="font-semibold text-burgundy">{tile.label}</p>
                <p className="text-xs text-burgundy/60">{tile.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {isPending && memberSince?.createdAt && (
        <p className="mt-6 text-center text-xs text-burgundy/55">
          Requested {formatRequestDateTime(memberSince.createdAt)}
        </p>
      )}
    </div>
  );
}
