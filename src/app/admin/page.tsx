"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDate } from "@/lib/utils";

type PendingMember = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  avatarUrl: string | null;
};

type ChannelRequest = {
  id: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  channel: { name: string; slug: string };
};

type Block = {
  id: string;
  unblockedAt: string | null;
  user: { id: string; name: string; email: string };
};

type Meeting = {
  id: string;
  title: string;
  linkToken: string;
  status: string;
  recordingUrl: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [channelRequests, setChannelRequests] = useState<ChannelRequest[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [newMeetingTitle, setNewMeetingTitle] = useState("Repentance 101 Teaching");
  const [generatedLink, setGeneratedLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "meetings" | "blocks">("overview");

  const fetchData = useCallback(async () => {
    const [dashRes, meetRes, blockRes] = await Promise.all([
      fetch("/api/admin/dashboard"),
      fetch("/api/admin/meetings"),
      fetch("/api/admin/blocks"),
    ]);

    if (dashRes.ok) {
      const dash = await dashRes.json();
      setPendingMembers(dash.pendingMembers);
      setChannelRequests(dash.pendingChannelRequests);
    }
    if (meetRes.ok) {
      const meet = await meetRes.json();
      setMeetings(meet.meetings);
    }
    if (blockRes.ok) {
      const block = await blockRes.json();
      setBlocks(block.blocks);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function approveMember(userId: string) {
    await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status: "APPROVED" }),
    });
    fetchData();
  }

  async function rejectMember(userId: string) {
    await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status: "REJECTED" }),
    });
    fetchData();
  }

  async function handleChannelRequest(membershipId: string, status: "APPROVED" | "DENIED") {
    await fetch("/api/admin/channel-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId, status }),
    });
    fetchData();
  }

  async function removeFromChannel(membershipId: string) {
    await fetch("/api/admin/channel-requests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId }),
    });
    fetchData();
  }

  async function createMeeting() {
    const res = await fetch("/api/admin/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newMeetingTitle }),
    });
    const data = await res.json();
    if (res.ok) {
      setGeneratedLink(data.joinUrl);
      fetchData();
    }
  }

  async function meetingAction(meetingId: string, action: "start" | "end") {
    await fetch("/api/admin/meetings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId, action }),
    });
    fetchData();
  }

  async function unblockUser(blockId: string) {
    await fetch("/api/admin/blocks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId }),
    });
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-stone-500">Loading admin console...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Admin Console</h1>
          <p className="text-stone-600">Welcome, Norman — manage Repentance 101</p>
        </div>
        <Link href="/dashboard" className="text-sm text-amber-700 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="mb-6 flex gap-2 border-b border-stone-200">
        {(["overview", "meetings", "blocks"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === t
                ? "border-b-2 border-amber-600 text-amber-700"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-8">
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 font-serif text-xl font-semibold">
              Pending Memberships ({pendingMembers.length})
            </h2>
            {pendingMembers.length === 0 ? (
              <p className="text-stone-500">No pending membership requests.</p>
            ) : (
              <div className="space-y-3">
                {pendingMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl bg-stone-50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar userId={m.id} name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                      <div>
                        <p className="font-semibold">{m.name}</p>
                        <p className="text-sm text-stone-500">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => approveMember(m.id)}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectMember(m.id)}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 font-serif text-xl font-semibold">
              Channel Join Requests ({channelRequests.length})
            </h2>
            {channelRequests.length === 0 ? (
              <p className="text-stone-500">No pending channel requests.</p>
            ) : (
              <div className="space-y-3">
                {channelRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-xl bg-stone-50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        userId={req.user.id}
                        name={req.user.name}
                        avatarUrl={req.user.avatarUrl}
                        size="sm"
                      />
                      <div>
                        <p className="font-semibold">{req.user.name}</p>
                        <p className="text-sm text-stone-500">
                          Wants to join: <strong>{req.channel.name}</strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleChannelRequest(req.id, "APPROVED")}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChannelRequest(req.id, "DENIED")}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 font-serif text-xl font-semibold">Edit Public Content</h2>
            <div className="flex gap-4">
              <Link
                href="/channels/guidelines"
                className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-200"
              >
                Edit Guidelines
              </Link>
              <Link
                href="/channels/livestream"
                className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-200"
              >
                Edit Livestream Info
              </Link>
            </div>
          </section>
        </div>
      )}

      {tab === "meetings" && (
        <div className="space-y-8">
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 font-serif text-xl font-semibold">Create Meeting Link</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newMeetingTitle}
                onChange={(e) => setNewMeetingTitle(e.target.value)}
                className="flex-1 rounded-lg border border-stone-300 px-4 py-2"
                placeholder="Meeting title"
              />
              <button
                type="button"
                onClick={createMeeting}
                className="rounded-lg bg-amber-600 px-6 py-2 font-semibold text-white hover:bg-amber-700"
              >
                Generate Link
              </button>
            </div>
            {generatedLink && (
              <div className="mt-4 rounded-lg bg-green-50 p-4">
                <p className="text-sm font-medium text-green-900">Share this link with members:</p>
                <code className="mt-1 block break-all text-sm text-green-800">{generatedLink}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(generatedLink)}
                  className="mt-2 text-sm text-green-700 hover:underline"
                >
                  Copy to clipboard
                </button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 font-serif text-xl font-semibold">Meetings</h2>
            <div className="space-y-3">
              {meetings.map((m) => (
                <div key={m.id} className="rounded-xl bg-stone-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{m.title}</p>
                      <p className="text-sm text-stone-500">
                        Status: <span className="font-medium">{m.status}</span> ·{" "}
                        {formatDate(m.createdAt)}
                      </p>
                      <code className="text-xs text-stone-400">/meeting/{m.linkToken}</code>
                    </div>
                    <div className="flex gap-2">
                      {m.status === "SCHEDULED" && (
                        <button
                          type="button"
                          onClick={() => meetingAction(m.id, "start")}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white"
                        >
                          Start Meeting
                        </button>
                      )}
                      {m.status === "LIVE" && (
                        <>
                          <Link
                            href={`/meeting/${m.linkToken}`}
                            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white"
                          >
                            Join
                          </Link>
                          <button
                            type="button"
                            onClick={() => meetingAction(m.id, "end")}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
                          >
                            End Meeting
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {m.recordingUrl && m.status === "ENDED" && (
                    <a
                      href={m.recordingUrl}
                      download
                      className="mt-2 inline-block text-sm text-amber-700 hover:underline"
                    >
                      Download Recording
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "blocks" && (
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold">Block List</h2>
          {blocks.filter((b) => !b.unblockedAt).length === 0 ? (
            <p className="text-stone-500">No active blocks.</p>
          ) : (
            <div className="space-y-3">
              {blocks
                .filter((b) => !b.unblockedAt)
                .map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-xl bg-red-50 p-4"
                  >
                    <div>
                      <p className="font-semibold">{b.user.name}</p>
                      <p className="text-sm text-stone-500">{b.user.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => unblockUser(b.id)}
                      className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-900"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
