"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink, Lock, MessageSquare, UserMinus, Users } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { ShowMoreList } from "@/components/ShowMoreList";
import { CHANNELS, formatRequestDateTime } from "@/lib/utils";
import { CHANNEL_STATUS_OPTIONS, StatusToggle } from "./StatusToggle";
import type { ChannelMembershipStatus, ChannelRequest, ChannelSummary } from "./types";

type Props = {
  pendingRequests: ChannelRequest[];
  deniedRequests: ChannelRequest[];
  channels: ChannelSummary[];
  onStatusChange: (membershipId: string, status: ChannelMembershipStatus) => void;
  onRemoveMember: (membershipId: string) => void;
};

const TYPE_LABEL: Record<string, string> = {
  PUBLIC: "Public",
  PRIVATE: "Private",
  GENERAL: "Members",
};

const MEMBERS_PREVIEW = 5;

function ChannelRequestRow({
  req,
  currentStatus,
  onStatusChange,
}: {
  req: ChannelRequest;
  currentStatus: ChannelMembershipStatus;
  onStatusChange: (membershipId: string, status: ChannelMembershipStatus) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gold/25 bg-cream-dark p-4 sm:flex-row sm:items-center sm:justify-between">
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
            <strong>{req.channel.name}</strong>
          </p>
          <p className="text-xs text-burgundy/50">
            Requested {formatRequestDateTime(req.requestedAt)}
          </p>
        </div>
      </div>
      <StatusToggle
        value={currentStatus}
        options={CHANNEL_STATUS_OPTIONS}
        onChange={(status) => onStatusChange(req.id, status)}
      />
    </div>
  );
}

function ChannelMemberList({
  members,
  onStatusChange,
  onRemoveMember,
}: {
  members: ChannelSummary["approvedMembers"];
  onStatusChange: (membershipId: string, status: ChannelMembershipStatus) => void;
  onRemoveMember: (membershipId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? members : members.slice(0, MEMBERS_PREVIEW);
  const hasMore = members.length > MEMBERS_PREVIEW;

  return (
    <div className="mt-4 border-t border-gold/15 pt-4">
      <button
        type="button"
        onClick={() => hasMore && setExpanded((e) => !e)}
        className={`mb-2 flex w-full items-center justify-between gap-2 text-left text-xs font-semibold uppercase tracking-wide text-burgundy/60 ${
          hasMore ? "cursor-pointer hover:text-burgundy" : "cursor-default"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {members.length} member{members.length !== 1 ? "s" : ""}
        </span>
        {hasMore && (
          <span className="inline-flex items-center gap-1 normal-case tracking-normal">
            {expanded ? (
              <>
                Show less <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Show all <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </span>
        )}
      </button>
      <ul className={`space-y-2 ${expanded ? "max-h-64 overflow-y-auto pr-1" : ""}`}>
        {visible.map((m) => (
          <li
            key={m.membershipId}
            className="flex flex-col gap-2 rounded-lg bg-cream px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-2">
              <UserAvatar userId={m.id} name={m.name} avatarUrl={m.avatarUrl} size="sm" />
              <span className="truncate text-sm text-burgundy">{m.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusToggle
                value="APPROVED"
                options={CHANNEL_STATUS_OPTIONS}
                onChange={(status) => onStatusChange(m.membershipId, status)}
                size="sm"
              />
              <button
                type="button"
                onClick={() => onRemoveMember(m.membershipId)}
                className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-burgundy/70 hover:bg-burgundy/10 hover:text-burgundy"
                title="Remove from channel"
              >
                <UserMinus className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {!expanded && hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs font-semibold text-gold-muted hover:underline"
        >
          + {members.length - MEMBERS_PREVIEW} more members
        </button>
      )}
    </div>
  );
}

export function AdminChannelsPanel({
  pendingRequests,
  deniedRequests,
  channels,
  onStatusChange,
  onRemoveMember,
}: Props) {
  return (
    <div className="space-y-8 animate-fade-up">
      <section className="card-brand p-6">
        <h2 className="mb-1 font-serif text-xl font-semibold text-burgundy">
          Channel Join Requests
        </h2>
        <p className="mb-4 text-sm text-burgundy/60">
          Approve or deny private channel requests. Toggle status anytime to undo a decision.
        </p>
        {pendingRequests.length === 0 ? (
          <p className="rounded-xl bg-cream-dark px-4 py-6 text-center text-burgundy/60">
            No pending channel requests.
          </p>
        ) : (
          <ShowMoreList
            items={pendingRequests}
            initialCount={5}
            step={5}
            listClassName="space-y-3"
            moreLabel="requests"
            getKey={(req) => req.id}
            renderItem={(req) => (
              <ChannelRequestRow
                req={req}
                currentStatus="PENDING"
                onStatusChange={onStatusChange}
              />
            )}
          />
        )}
      </section>

      {deniedRequests.length > 0 && (
        <section className="card-brand p-6">
          <h2 className="mb-1 font-serif text-xl font-semibold text-burgundy">Denied Requests</h2>
          <p className="mb-4 text-sm text-burgundy/60">
            Switch back to Pending or Approved if you denied someone by mistake.
          </p>
          <ShowMoreList
            items={deniedRequests}
            initialCount={5}
            step={5}
            listClassName="space-y-3"
            moreLabel="requests"
            getKey={(req) => req.id}
            renderItem={(req) => (
              <ChannelRequestRow
                req={req}
                currentStatus="DENIED"
                onStatusChange={onStatusChange}
              />
            )}
          />
        </section>
      )}

      <section className="card-brand p-6">
        <h2 className="mb-4 font-serif text-xl font-semibold text-burgundy">All Channels</h2>
        <ShowMoreList
          items={channels}
          initialCount={6}
          step={4}
          listClassName="grid gap-4 md:grid-cols-2"
          moreLabel="channels"
          getKey={(ch) => ch.id}
          renderItem={(ch) => {
            const meta = Object.values(CHANNELS).find((c) => c.slug === ch.slug);
            const isPublic = ch.type === "PUBLIC";
            const href =
              ch.slug === "livestream"
                ? "/livestream"
                : ch.slug === "guidelines"
                  ? "/channels/guidelines"
                  : `/channels/${ch.slug}`;

            return (
              <div className="rounded-xl border border-gold/25 bg-cream-dark p-5">
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
                </div>

                {ch.type !== "PUBLIC" && ch.approvedMembers.length > 0 && (
                  <ChannelMemberList
                    members={ch.approvedMembers}
                    onStatusChange={onStatusChange}
                    onRemoveMember={onRemoveMember}
                  />
                )}
              </div>
            );
          }}
        />
      </section>
    </div>
  );
}
