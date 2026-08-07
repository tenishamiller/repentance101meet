"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MINISTRY_NAME } from "@/lib/brand";
import { BrandDivider } from "@/components/BrandDivider";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDate } from "@/lib/utils";
import { MemberJoinLink } from "@/components/livestream/MemberJoinLink";

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
  const [generatedLinkToken, setGeneratedLinkToken] = useState("");
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
      setGeneratedLinkToken(data.meeting.linkToken);
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
        <p className="text-burgundy/60">Loading admin console...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <section className="hero-brand mb-10 overflow-hidden rounded-3xl px-6 py-8 md:px-10 md:py-10">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <Image
              src="/brand/repentance101-logo.png"
              alt="Repentance 101"
              width={80}
              height={80}
              className="seal-ring shrink-0 rounded-full ring-offset-burgundy-deep"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-light">
                Admin · {MINISTRY_NAME}
              </p>
              <h1 className="font-serif text-3xl font-bold text-cream md:text-4xl">
                Admin Console
              </h1>
              <p className="mt-1 text-gold-light/90">Manage Repentance 101 ministry</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="btn-secondary shrink-0 !border-gold/50 !text-gold-light"
          >
            ← Dashboard
          </Link>
        </div>
        <BrandDivider light className="my-6" />
        <div className="flex flex-wrap gap-2">
          {(["overview", "meetings", "blocks"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                tab === t
                  ? "bg-gold text-burgundy-deep shadow-md"
                  : "border border-gold/30 text-gold-light hover:bg-gold/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {tab === "overview" && (
        <div className="space-y-8">
          <section className="card-brand p-6">
            <h2 className="mb-4 font-serif text-xl font-semibold text-burgundy">
              Pending Memberships ({pendingMembers.length})
            </h2>
            {pendingMembers.length === 0 ? (
              <p className="text-burgundy/60">No pending membership requests.</p>
            ) : (
              <div className="space-y-3">
                {pendingMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-gold/20 bg-cream-dark p-4"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar userId={m.id} name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                      <div>
                        <p className="font-semibold text-burgundy">{m.name}</p>
                        <p className="text-sm text-burgundy/60">{m.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => approveMember(m.id)}
                        className="btn-primary !px-4 !py-2 text-sm"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectMember(m.id)}
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

          <section className="card-brand p-6">
            <h2 className="mb-4 font-serif text-xl font-semibold text-burgundy">
              Channel Join Requests ({channelRequests.length})
            </h2>
            {channelRequests.length === 0 ? (
              <p className="text-burgundy/60">No pending channel requests.</p>
            ) : (
              <div className="space-y-3">
                {channelRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-xl border border-gold/20 bg-cream-dark p-4"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        userId={req.user.id}
                        name={req.user.name}
                        avatarUrl={req.user.avatarUrl}
                        size="sm"
                      />
                      <div>
                        <p className="font-semibold text-burgundy">{req.user.name}</p>
                        <p className="text-sm text-burgundy/60">
                          Wants to join: <strong>{req.channel.name}</strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleChannelRequest(req.id, "APPROVED")}
                        className="btn-primary !px-4 !py-2 text-sm"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChannelRequest(req.id, "DENIED")}
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

          <section className="card-brand p-6">
            <h2 className="mb-4 font-serif text-xl font-semibold text-burgundy">Edit Public Content</h2>
            <div className="flex gap-4">
              <Link
                href="/channels/guidelines"
                className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-burgundy hover:bg-gold/20"
              >
                Edit Guidelines
              </Link>
              <Link
                href="/channels/livestream"
                className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-burgundy hover:bg-gold/20"
              >
                Edit Livestream Info
              </Link>
            </div>
          </section>
        </div>
      )}

      {tab === "meetings" && (
        <div className="space-y-8">
          <section className="card-brand p-6">
            <h2 className="mb-2 font-serif text-2xl font-bold text-burgundy">
              Generate Member Join Link
            </h2>
            <p className="mb-6 text-burgundy/70">
              Create a special link for your teaching session. Share it with approved
              members — they use it to watch live, chat, and raise their hand.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={newMeetingTitle}
                onChange={(e) => setNewMeetingTitle(e.target.value)}
                className="input-field flex-1"
                placeholder="e.g. Repentance 101 — Sunday Teaching"
              />
              <button
                type="button"
                onClick={createMeeting}
                className="btn-primary shrink-0 !px-8 !py-3 font-serif text-base"
              >
                Generate Member Link
              </button>
            </div>
          </section>

          {generatedLinkToken && (
            <MemberJoinLink
              meetingToken={generatedLinkToken}
              title="Your Member Join Link"
              variant="hero"
            />
          )}

          <section className="card-brand p-6">
            <h2 className="mb-4 font-serif text-xl font-semibold text-burgundy">Your Meetings</h2>
            <div className="space-y-4">
              {meetings.length === 0 && (
                <p className="text-burgundy/60">No meetings yet — generate a member link above.</p>
              )}
              {meetings.map((m) => (
                <div key={m.id} className="rounded-xl border border-gold/30 bg-cream-dark p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <p className="font-serif text-lg font-semibold text-burgundy">{m.title}</p>
                      <p className="mt-1 text-sm text-burgundy/60">
                        Status:{" "}
                        <span
                          className={
                            m.status === "LIVE"
                              ? "font-bold text-gold-muted"
                              : "font-medium text-burgundy"
                          }
                        >
                          {m.status === "LIVE" ? "● LIVE NOW" : m.status}
                        </span>
                        {" · "}
                        {formatDate(m.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {m.status === "SCHEDULED" && (
                        <>
                          <button
                            type="button"
                            onClick={() => meetingAction(m.id, "start")}
                            className="btn-primary !px-4 !py-2 text-sm"
                          >
                            Start Meeting
                          </button>
                          <Link
                            href={`/meeting/${m.linkToken}`}
                            className="btn-outline-gold !px-4 !py-2 text-sm"
                          >
                            Open as Host
                          </Link>
                        </>
                      )}
                      {m.status === "LIVE" && (
                        <>
                          <Link
                            href={`/meeting/${m.linkToken}`}
                            className="btn-burgundy !px-4 !py-2 text-sm"
                          >
                            Go Live (Host)
                          </Link>
                          <button
                            type="button"
                            onClick={() => meetingAction(m.id, "end")}
                            className="rounded-lg border border-burgundy/30 bg-burgundy/10 px-4 py-2 text-sm font-medium text-burgundy hover:bg-burgundy/20"
                          >
                            End from Admin
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <MemberJoinLink meetingToken={m.linkToken} variant="row" />

                  {m.recordingUrl && m.status === "ENDED" && (
                    <a
                      href={m.recordingUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-burgundy-deep shadow hover:bg-gold-light"
                    >
                      ⬇ Download Recording (MP4/WebM)
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "blocks" && (
        <section className="card-brand p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold text-burgundy">Block List</h2>
          {blocks.filter((b) => !b.unblockedAt).length === 0 ? (
            <p className="text-burgundy/60">No active blocks.</p>
          ) : (
            <div className="space-y-3">
              {blocks
                .filter((b) => !b.unblockedAt)
                .map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-xl border border-gold/20 bg-cream-dark p-4"
                  >
                    <div>
                      <p className="font-semibold text-burgundy">{b.user.name}</p>
                      <p className="text-sm text-burgundy/60">{b.user.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => unblockUser(b.id)}
                      className="btn-burgundy !px-4 !py-2 text-sm"
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
