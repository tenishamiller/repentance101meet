"use client";

import { useState } from "react";
import type { Channel } from "@/generated/prisma/client";
import { MINISTRY_LEADER } from "@/lib/brand";
import { BrandDivider } from "@/components/BrandDivider";
import { formatRequestDateTime } from "@/lib/utils";

type Props = {
  channel: Channel;
  membershipStatus: string | null;
  requestedAt?: string | null;
};

export function JoinChannelRequest({ channel, membershipStatus, requestedAt }: Props) {
  const [status, setStatus] = useState(membershipStatus);
  const [requestTime, setRequestTime] = useState(requestedAt ?? null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function requestJoin() {
    setLoading(true);
    const res = await fetch(`/api/channels/${channel.slug}/join`, {
      method: "POST",
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setStatus("PENDING");
      setRequestTime(data.membership?.requestedAt ?? new Date().toISOString());
      setMessage("Your join request has been sent for approval.");
    } else {
      setMessage(data.error ?? "Request failed");
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-serif text-3xl font-bold text-burgundy">{channel.name}</h1>
      <BrandDivider className="my-4 max-w-xs" />
      <p className="text-burgundy/70">{channel.description}</p>

      {status === "PENDING" ? (
        <div className="mt-8 rounded-xl border border-gold/40 bg-gold/10 px-6 py-4 text-burgundy">
          <p className="font-semibold">Request Pending</p>
          <p className="mt-1 text-sm">
            Your request will be reviewed by {MINISTRY_LEADER}. Check back here for updates.
          </p>
          {requestTime && (
            <p className="mt-3 text-xs font-medium text-burgundy/70">
              Requested {formatRequestDateTime(requestTime)}
            </p>
          )}
        </div>
      ) : status === "DENIED" ? (
        <div className="mt-8 rounded-xl border border-burgundy/30 bg-burgundy/5 px-6 py-4 text-burgundy">
          <p className="font-semibold">Request Denied</p>
          <p className="mt-1 text-sm">Contact {MINISTRY_LEADER} if you have questions.</p>
          {requestTime && (
            <p className="mt-3 text-xs text-burgundy/60">
              Original request: {formatRequestDateTime(requestTime)}
            </p>
          )}
        </div>
      ) : status === "REMOVED" ? (
        <div className="mt-8 space-y-4">
          <div className="rounded-xl border border-gold/30 bg-cream-dark px-6 py-4 text-burgundy/80">
            <p>You were removed from this channel.</p>
          </div>
          <button type="button" onClick={requestJoin} disabled={loading} className="btn-primary">
            Request to Join Again
          </button>
        </div>
      ) : (
        <button type="button" onClick={requestJoin} disabled={loading} className="btn-primary mt-8">
          {loading ? "Sending..." : "Request to Join"}
        </button>
      )}

      {message && <p className="mt-4 text-sm text-burgundy/70">{message}</p>}
    </div>
  );
}
