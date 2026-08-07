"use client";

import { useState } from "react";
import type { Channel } from "@/generated/prisma/client";

type Props = {
  channel: Channel;
  membershipStatus: string | null;
};

export function JoinChannelRequest({ channel, membershipStatus }: Props) {
  const [status, setStatus] = useState(membershipStatus);
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
      setMessage("Your join request has been sent to Norman for approval.");
    } else {
      setMessage(data.error ?? "Request failed");
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-serif text-3xl font-bold">{channel.name}</h1>
      <p className="mt-3 text-stone-600">{channel.description}</p>

      {status === "PENDING" ? (
        <div className="mt-8 rounded-xl bg-amber-50 px-6 py-4 text-amber-900">
          <p className="font-semibold">Request Pending</p>
          <p className="mt-1 text-sm">
            Norman will review your request. Check back here for updates.
          </p>
        </div>
      ) : status === "DENIED" ? (
        <div className="mt-8 rounded-xl bg-red-50 px-6 py-4 text-red-800">
          <p className="font-semibold">Request Denied</p>
          <p className="mt-1 text-sm">Contact Norman if you have questions.</p>
        </div>
      ) : status === "REMOVED" ? (
        <div className="mt-8 space-y-4">
          <div className="rounded-xl bg-stone-100 px-6 py-4 text-stone-700">
            <p>You were removed from this channel.</p>
          </div>
          <button
            type="button"
            onClick={requestJoin}
            disabled={loading}
            className="rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            Request to Join Again
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={requestJoin}
          disabled={loading}
          className="mt-8 rounded-lg bg-amber-600 px-8 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Request to Join"}
        </button>
      )}

      {message && <p className="mt-4 text-sm text-stone-600">{message}</p>}
    </div>
  );
}
