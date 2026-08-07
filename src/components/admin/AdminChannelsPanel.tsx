"use client";

import Link from "next/link";
import { ExternalLink, Lock, MessageSquare, UserMinus, Users } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { CHANNELS } from "@/lib/utils";
import type { ChannelRequest, ChannelSummary } from "./types";

type Props = {
  pendingRequests: ChannelRequest[];
  channels: ChannelSummary[];
  onApproveRequest: (membershipId: string) => void;
  onDenyRequest: (membershipId: string) => void;
  onRemoveMember: (membershipId: string) => void;
};

const TYPE_LABEL: Record<string, string> = {
  PUBLIC: "Public",
  PRIVATE: "Private",
  GENERAL: "Members",
};

export function AdminChannelsPanel({
  pendingRequests,
  channels,
  onApproveRequest,
  onDenyRequest,
  onRemoveMember,
}: Props) {
  return (
    <div className="space-y-8 animate-fade-up">
      {/* Pending requests */}
      <section className="card-brand p-6">
        <h2 className="mb-1 font-serif text-xl font-semibold text-burgundy">
          Channel Join Requests
        </h2>
        <p className="mb-4 text-sm text-burgundy/60">
          Approve or deny requests for private channels like Resource, Accountability, and Tough
          Questions.
        </p>
        {pendingRequests.length === 0 ? (
          <p className="rounded-xl bg-cream-dark px-4 py-6 text-center text-burgundy/60">
            No pending channel requests.
          </p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col gap-4 rounded-xl border border-gold/25 bg-cream-dark p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    userId={req.user.id}
                    name={req.user.name}
                    avatarUrl={req.user.avatarUrl}
                    size="md"
                  />
                  <div>
                    <p className="font-semibold text-burgundy">{req.user.name}</p>
                    <p className="text-sm text-burgundy/60">
                      Wants to join <strong>{req.channel.name}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onApproveRequest(req.id)}
                    className="btn-primary !px-4 !py-2 text-sm"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onDenyRequest(req.id)}
                    className="btn-outline-gold !px-4 !py-2 text-sm"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Channel overview */}
      <section className="card-brand p-6">
        <h2 className="mb-4 font-serif text-xl font-semibold text-burgundy">All Channels</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {channels.map((ch) => {
            const meta = Object.values(CHANNELS).find((c) => c.slug === ch.slug);
            const isPublic = ch.type === "PUBLIC";
            const href =
              ch.slug === "livestream"
                ? "/livestream"
                : ch.slug === "guidelines"
                  ? "/channels/guidelines"
                  : `/channels/${ch.slug}`;

            return (
              <div
                key={ch.id}
                className="rounded-xl border border-gold/25 bg-cream-dark p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-serif text-lg font-semibold text-burgundy">{ch.name}</p>
                    <p className="mt-1 text-xs text-burgundy/55">
                      {TYPE_LABEL[ch.type] ?? ch.type}
                      {ch.pendingCount > 0 && (
                        <span className="ml-2 rounded-full bg-burgundy/10 px-2 py-0.5 font-semibold text-burgundy">
                          {ch.pendingCount} pending
                        </span>
                      )}
                    </p>
                    <p className="mt-2 text-sm text-burgundy/70">
                      {meta?.description ?? ch.description}
                    </p>
                  </div>
                  {isPublic ? (
                    <ExternalLink className="h-4 w-4 shrink-0 text-gold-muted" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-gold-muted" />
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 px-3 py-1.5 text-xs font-semibold text-burgundy hover:bg-gold/10"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Open Channel
                  </Link>
                  {isPublic && (
                    <Link
                      href={href}
                      className="rounded-lg bg-gold/15 px-3 py-1.5 text-xs font-semibold text-burgundy hover:bg-gold/25"
                    >
                      Edit Content
                    </Link>
                  )}
                </div>

                {ch.type !== "PUBLIC" && ch.approvedMembers.length > 0 && (
                  <div className="mt-4 border-t border-gold/15 pt-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-burgundy/60">
                      <Users className="h-3.5 w-3.5" />
                      {ch.approvedMembers.length} member
                      {ch.approvedMembers.length !== 1 ? "s" : ""}
                    </p>
                    <ul className="space-y-2">
                      {ch.approvedMembers.map((m) => (
                        <li
                          key={m.membershipId}
                          className="flex items-center justify-between gap-2 rounded-lg bg-cream px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <UserAvatar
                              userId={m.id}
                              name={m.name}
                              avatarUrl={m.avatarUrl}
                              size="sm"
                            />
                            <span className="truncate text-sm text-burgundy">{m.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveMember(m.membershipId)}
                            className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-burgundy/70 hover:bg-burgundy/10 hover:text-burgundy"
                            title="Remove from channel"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
