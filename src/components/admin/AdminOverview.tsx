"use client";

import Link from "next/link";
import {
  AlertCircle,
  Ban,
  Heart,
  Radio,
  UserCheck,
  Users,
  Video,
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDate, formatRequestDateTime } from "@/lib/utils";
import type { DashboardStats } from "./types";

type Props = {
  stats: DashboardStats;
  onGoTo: (tab: "members" | "channels" | "livestream" | "private" | "blocks") => void;
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  accent?: "live" | "warn";
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          accent === "live"
            ? "bg-gold/20 text-gold-muted"
            : accent === "warn"
              ? "bg-burgundy/10 text-burgundy"
              : "bg-gold/15 text-gold-muted"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-burgundy">{value}</p>
        <p className="text-sm text-burgundy/60">{label}</p>
      </div>
    </>
  );

  const cls =
    "card-brand card-glow flex items-center gap-4 p-5 text-left transition w-full";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  }

  return <div className={cls}>{inner}</div>;
}

export function AdminOverview({ stats, onGoTo }: Props) {
  const liveStream = stats.liveMeetings.find((m) => !m.kind || m.kind === "LIVESTREAM");
  const pendingTotal =
    stats.pendingMembers.length + stats.pendingChannelRequests.length;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Live banners */}
      {liveStream && (
        <div className="hero-brand rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="badge-live mb-2 w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
                </span>
                LIVE NOW
              </p>
              <h2 className="font-serif text-2xl font-bold text-cream">{liveStream.title}</h2>
              <p className="mt-1 text-sm text-gold-light/90">
                Your teaching session is live. Open the Livestream tab to return to your broadcast.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onGoTo("livestream")}
              className="btn-primary inline-flex shrink-0 items-center gap-2 !px-6"
            >
              <Video className="h-5 w-5" />
              Open Livestream Tab
            </button>
          </div>
        </div>
      )}

      {stats.livePrivateSessions.length > 0 && (
        <div className="rounded-2xl border-2 border-gold/40 bg-cream-dark p-6">
          <p className="flex items-center gap-2 font-semibold text-burgundy">
            <Heart className="h-5 w-5 text-gold-muted" />
            Private session in progress
          </p>
          <ul className="mt-3 space-y-2">
            {stats.livePrivateSessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-burgundy/80">
                  {s.title}
                  {s.invitedUser ? ` · with ${s.invitedUser.name}` : ""}
                </span>
                <Link
                  href={`/personal-ministry/${s.linkToken}`}
                  className="btn-burgundy !px-4 !py-2 text-sm"
                >
                  Enter Session
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Approved members"
          value={stats.approvedMemberCount}
          icon={UserCheck}
          onClick={() => onGoTo("members")}
        />
        <StatCard
          label="Pending approvals"
          value={stats.pendingMembers.length}
          icon={AlertCircle}
          accent={stats.pendingMembers.length > 0 ? "warn" : undefined}
          onClick={() => onGoTo("members")}
        />
        <StatCard
          label="Channel requests"
          value={stats.pendingChannelRequests.length}
          icon={Users}
          accent={stats.pendingChannelRequests.length > 0 ? "warn" : undefined}
          onClick={() => onGoTo("channels")}
        />
        <StatCard
          label="Active blocks"
          value={stats.activeBlocks.length}
          icon={Ban}
          onClick={() => onGoTo("blocks")}
        />
      </div>

      {/* Quick actions */}
      <section className="card-brand p-6">
        <h2 className="mb-4 font-serif text-xl font-semibold text-burgundy">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => onGoTo("livestream")}
            className="rounded-xl border border-gold/30 bg-cream-dark p-4 text-left transition hover:border-gold hover:bg-gold/10"
          >
            <Radio className="mb-2 h-6 w-6 text-gold-muted" />
            <p className="font-semibold text-burgundy">Start Livestream</p>
            <p className="mt-1 text-xs text-burgundy/60">Go live & teach</p>
          </button>
          <button
            type="button"
            onClick={() => onGoTo("private")}
            className="rounded-xl border border-gold/30 bg-cream-dark p-4 text-left transition hover:border-gold hover:bg-gold/10"
          >
            <Heart className="mb-2 h-6 w-6 text-gold-muted" />
            <p className="font-semibold text-burgundy">Personal Ministry</p>
            <p className="mt-1 text-xs text-burgundy/60">Invite member for 1-on-1</p>
          </button>
          <button
            type="button"
            onClick={() => onGoTo("members")}
            className="rounded-xl border border-gold/30 bg-cream-dark p-4 text-left transition hover:border-gold hover:bg-gold/10"
          >
            <UserCheck className="mb-2 h-6 w-6 text-gold-muted" />
            <p className="font-semibold text-burgundy">Review Members</p>
            <p className="mt-1 text-xs text-burgundy/60">
              {stats.pendingMembers.length} waiting
            </p>
          </button>
          <button
            type="button"
            onClick={() => onGoTo("channels")}
            className="rounded-xl border border-gold/30 bg-cream-dark p-4 text-left transition hover:border-gold hover:bg-gold/10"
          >
            <Users className="mb-2 h-6 w-6 text-gold-muted" />
            <p className="font-semibold text-burgundy">Channel Access</p>
            <p className="mt-1 text-xs text-burgundy/60">
              {stats.pendingChannelRequests.length} requests
            </p>
          </button>
        </div>
      </section>

      {/* Needs attention */}
      {pendingTotal > 0 && (
        <section className="card-brand p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold text-burgundy">
            Needs Your Attention
          </h2>
          <div className="space-y-3">
            {stats.pendingMembers.slice(0, 3).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-gold/20 bg-cream-dark p-3"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar userId={m.id} name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-burgundy">{m.name}</p>
                    <p className="text-xs text-burgundy/60">
                      Membership request · {formatRequestDateTime(m.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-burgundy">
                  Pending
                </span>
              </div>
            ))}
            {stats.pendingChannelRequests.slice(0, 2).map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-xl border border-gold/20 bg-cream-dark p-3"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    userId={req.user.id}
                    name={req.user.name}
                    avatarUrl={req.user.avatarUrl}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-semibold text-burgundy">{req.user.name}</p>
                    <p className="text-xs text-burgundy/60">
                      Wants to join {req.channel.name} · {formatRequestDateTime(req.requestedAt)}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-burgundy/10 px-3 py-1 text-xs font-semibold text-burgundy">
                  Channel
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onGoTo("members")}
            className="mt-4 text-sm font-semibold text-gold-muted hover:underline"
          >
            Review all pending items →
          </button>
        </section>
      )}
    </div>
  );
}
