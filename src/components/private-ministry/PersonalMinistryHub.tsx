"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Heart,
  Plus,
  Shield,
  UserPlus,
  Video,
} from "lucide-react";
import { BrandDivider } from "@/components/BrandDivider";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDate } from "@/lib/utils";

type Member = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type PrivateSession = {
  id: string;
  title: string;
  linkToken: string;
  status: string;
  createdAt: string;
  invitedUser: Member | null;
  createdBy: { id: string; name: string; avatarUrl: string | null };
};

type Props = {
  isAdmin: boolean;
  userName: string;
};

export function PersonalMinistryHub({ isAdmin, userName }: Props) {
  const [sessions, setSessions] = useState<PrivateSession[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [invitedUserId, setInvitedUserId] = useState("");
  const [creating, setCreating] = useState(false);
  const [lastJoinUrl, setLastJoinUrl] = useState("");

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/private-ministry");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setSessions(data.sessions);
    setMembers(data.approvedMembers ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchSessions();
    const interval = setInterval(() => void fetchSessions(), 8000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  async function createSession() {
    if (!invitedUserId) return;
    setCreating(true);
    const res = await fetch("/api/private-ministry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, invitedUserId }),
    });
    setCreating(false);
    if (res.ok) {
      const data = await res.json();
      setLastJoinUrl(data.joinUrl);
      setTitle("");
      setInvitedUserId("");
      void fetchSessions();
    }
  }

  async function sessionAction(sessionId: string, action: "start" | "end") {
    await fetch("/api/private-ministry", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action }),
    });
    void fetchSessions();
  }

  const liveInvite = sessions.find(
    (s) => s.status === "LIVE" && !isAdmin,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="hero-brand relative overflow-hidden rounded-3xl p-8 text-cream shadow-2xl md:p-12">
        <div className="pointer-events-none absolute -right-10 top-0 h-48 w-48 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-light">
            <Shield className="h-4 w-4" />
            Private · One-on-One
          </div>
          <h1 className="font-serif text-3xl font-bold md:text-4xl">Personal Ministry</h1>
          <BrandDivider light className="my-4 max-w-md" />
          <p className="max-w-2xl text-lg text-cream/90">
            {isAdmin
              ? "Invite a member for a private video call — personal pastoral care, prayer, and counsel. Separate from the public live teaching room."
              : "Private one-on-one time with ministry leadership. When you're invited, your session will appear below."}
          </p>

          {!isAdmin && liveInvite && (
            <Link
              href={`/personal-ministry/${liveInvite.linkToken}`}
              className="btn-primary mt-8 inline-flex items-center gap-2 !px-8 !py-4 !text-lg"
            >
              <Video className="h-6 w-6" />
              Join Private Session
            </Link>
          )}
        </div>
      </section>

      {isAdmin && (
        <section className="card-brand mt-8 p-6">
          <h2 className="mb-2 flex items-center gap-2 font-serif text-xl font-bold text-burgundy">
            <UserPlus className="h-5 w-5 text-gold-muted" />
            Invite a Member
          </h2>
          <p className="mb-6 text-sm text-burgundy/70">
            Choose an approved member and start a private session. Only they can enter — no one else
            sees or joins this room.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="e.g. Prayer & counsel — follow-up"
            />
            <select
              value={invitedUserId}
              onChange={(e) => setInvitedUserId(e.target.value)}
              className="input-field"
            >
              <option value="">Select member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!invitedUserId || creating}
            onClick={() => void createSession()}
            className="btn-primary mt-4 inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Creating..." : "Create Private Session"}
          </button>

          {lastJoinUrl && (
            <div className="mt-4 rounded-xl border border-gold/30 bg-cream-dark p-4">
              <p className="text-sm font-semibold text-burgundy">Session created</p>
              <p className="mt-1 break-all text-sm text-burgundy/70">{lastJoinUrl}</p>
              <p className="mt-2 text-xs text-burgundy/60">
                Start the session below, then the member can join from this page.
              </p>
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-bold text-burgundy">
          <Calendar className="h-5 w-5 text-gold-muted" />
          {isAdmin ? "Your Private Sessions" : "Your Invitations"}
        </h2>

        {loading ? (
          <p className="text-burgundy/60">Loading...</p>
        ) : sessions.length === 0 ? (
          <div className="card-brand p-8 text-center">
            <Heart className="mx-auto h-10 w-10 text-gold-muted" />
            <p className="mt-3 font-serif text-burgundy">
              {isAdmin
                ? "No private sessions yet — invite a member above."
                : "No private sessions scheduled for you yet."}
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {sessions.map((s) => (
              <li key={s.id} className="card-brand p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    {s.invitedUser && (
                      <UserAvatar
                        userId={s.invitedUser.id}
                        name={s.invitedUser.name}
                        avatarUrl={s.invitedUser.avatarUrl}
                        size="md"
                      />
                    )}
                    <div>
                      <p className="font-serif text-lg font-semibold text-burgundy">{s.title}</p>
                      <p className="mt-1 text-sm text-burgundy/60">
                        {isAdmin && s.invitedUser
                          ? `With ${s.invitedUser.name}`
                          : "With session host"}
                        {" · "}
                        {formatDate(s.createdAt)}
                      </p>
                      <p className="mt-1 text-sm">
                        {s.status === "LIVE" ? (
                          <span className="font-bold text-gold-muted">● Live now — ready to join</span>
                        ) : s.status === "SCHEDULED" ? (
                          <span className="text-burgundy/70">
                            {isAdmin ? "Scheduled — click Start when ready" : "Waiting for the host to start"}
                          </span>
                        ) : (
                          <span className="text-burgundy/50">Ended</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isAdmin && s.status === "SCHEDULED" && (
                      <button
                        type="button"
                        onClick={() => void sessionAction(s.id, "start")}
                        className="btn-primary !px-4 !py-2 text-sm"
                      >
                        Start Session
                      </button>
                    )}
                    {isAdmin && s.status === "LIVE" && (
                      <>
                        <Link
                          href={`/personal-ministry/${s.linkToken}`}
                          className="btn-burgundy !px-4 !py-2 text-sm"
                        >
                          Enter as Host
                        </Link>
                        <button
                          type="button"
                          onClick={() => void sessionAction(s.id, "end")}
                          className="rounded-lg border border-burgundy/30 bg-burgundy/10 px-4 py-2 text-sm font-medium text-burgundy hover:bg-burgundy/20"
                        >
                          End Session
                        </button>
                      </>
                    )}
                    {!isAdmin && s.status === "LIVE" && (
                      <Link
                        href={`/personal-ministry/${s.linkToken}`}
                        className="btn-primary !px-4 !py-2 text-sm"
                      >
                        Join Private Session
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isAdmin && (
        <p className="mt-8 text-center text-sm text-burgundy/60">
          Welcome, {userName}. This space is only for sessions you&apos;re personally invited to — separate from the public live teaching at{" "}
          <Link href="/livestream" className="font-medium text-burgundy underline">
            Live Meeting
          </Link>
          .
        </p>
      )}
    </div>
  );
}
