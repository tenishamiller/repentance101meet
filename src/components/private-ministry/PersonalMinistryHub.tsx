"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Heart,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  Video,
} from "lucide-react";
import { BrandDivider } from "@/components/BrandDivider";
import { UserAvatar } from "@/components/UserAvatar";
import { AppPathLink } from "@/components/AppPathLink";
import { PaginatedScrollList } from "@/components/admin/PaginatedScrollList";
import { ShowMoreList } from "@/components/ShowMoreList";
import { MemberSearchPicker } from "@/components/admin/MemberSearchPicker";
import { formatDate } from "@/lib/utils";
import type { Member } from "@/components/admin/types";

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
  userName?: string;
  embedded?: boolean;
};

export function PersonalMinistryHub({ isAdmin, userName = "", embedded = false }: Props) {
  const [sessions, setSessions] = useState<PrivateSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [invitedMember, setInvitedMember] = useState<Member | null>(null);
  const [creating, setCreating] = useState(false);
  const [lastJoinUrl, setLastJoinUrl] = useState("");
  const [error, setError] = useState("");

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/private-ministry");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setSessions(data.sessions);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchSessions();
    const interval = setInterval(() => void fetchSessions(), 8000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  async function createSession() {
    if (!invitedMember) return;
    setCreating(true);
    setError("");
    const res = await fetch("/api/private-ministry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, invitedUserId: invitedMember.id }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Could not create session.");
      return;
    }
    const data = await res.json();
    setLastJoinUrl(data.joinUrl);
    setTitle("");
    setInvitedMember(null);
    void fetchSessions();
  }

  async function sessionAction(sessionId: string, action: "start" | "end" | "hide") {
    if (action === "hide") {
      const sure = window.confirm(
        isAdmin
          ? "Remove this session from your log? The member will still see it in their Personal Ministry history."
          : "Remove this session from your log? Your host will still see it in their Personal Ministry history.",
      );
      if (!sure) return;
    }

    const res = await fetch("/api/private-ministry", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action }),
    });

    if (!res.ok && action === "hide") {
      const data = await res.json().catch(() => ({}));
      window.alert(typeof data.error === "string" ? data.error : "Could not remove session.");
      return;
    }

    void fetchSessions();
  }

  const liveInvite = sessions.find((s) => s.status === "LIVE" && !isAdmin);
  const activeSessions = sessions.filter((s) => s.status !== "ENDED");
  const endedSessions = sessions.filter((s) => s.status === "ENDED");

  function renderSessionCard(s: PrivateSession) {
    return (
      <div className="card-brand p-5">
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
                  : `With Your Session Host ${s.createdBy.name}`}
                {" · "}
                {formatDate(s.createdAt)}
              </p>
              <p className="mt-1 text-sm">
                {s.status === "LIVE" ? (
                  <span className="font-bold text-gold-muted">● Live now — ready to join</span>
                ) : s.status === "SCHEDULED" ? (
                  <span className="text-burgundy/70">
                    {isAdmin
                      ? "Scheduled — enter to start the session"
                      : "Waiting for the host to enter"}
                  </span>
                ) : (
                  <span className="text-burgundy/50">Ended</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isAdmin && (s.status === "SCHEDULED" || s.status === "LIVE") && (
              <>
                <AppPathLink
                  href={`/personal-ministry/${s.linkToken}`}
                  className="btn-primary !px-4 !py-2 text-sm"
                >
                  {s.status === "SCHEDULED" ? "Start & Enter" : "Enter as Host"}
                </AppPathLink>
                {s.status === "LIVE" && (
                  <button
                    type="button"
                    onClick={() => void sessionAction(s.id, "end")}
                    className="rounded-lg border border-burgundy/30 bg-burgundy/10 px-4 py-2 text-sm font-medium text-burgundy hover:bg-burgundy/20"
                  >
                    End Session
                  </button>
                )}
              </>
            )}
            {!isAdmin && (s.status === "SCHEDULED" || s.status === "LIVE") && (
              <AppPathLink
                href={`/personal-ministry/${s.linkToken}`}
                className="btn-primary !px-4 !py-2 text-sm"
              >
                {s.status === "LIVE" ? "Join Private Session" : "Open Session"}
              </AppPathLink>
            )}
            {s.status !== "LIVE" && (
              <button
                type="button"
                onClick={() => void sessionAction(s.id, "hide")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-burgundy/25 px-3 py-2 text-sm font-medium text-burgundy/70 hover:bg-burgundy/5 hover:text-burgundy"
                title="Remove from your log only"
              >
                <Trash2 className="h-4 w-4" />
                Remove from log
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "mx-auto max-w-5xl px-4 py-10"}>
      {!embedded && (
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
              <AppPathLink
                href={`/personal-ministry/${liveInvite.linkToken}`}
                className="btn-primary mt-8 inline-flex items-center gap-2 !px-8 !py-4 !text-lg"
              >
                <Video className="h-6 w-6" />
                Join Private Session
              </AppPathLink>
            )}
          </div>
        </section>
      )}

      {embedded && (
        <section className="card-brand mb-8 p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold-muted">
            <Shield className="h-3.5 w-3.5" />
            Private · One-on-One
          </div>
          <h2 className="font-serif text-2xl font-bold text-burgundy">Personal Ministry</h2>
          <p className="mt-2 text-sm text-burgundy/70">
            Invite a member for private video — pastoral care, prayer, and counsel. Separate from
            the public live teaching room.
          </p>
        </section>
      )}

      {isAdmin && (
        <section className={`card-brand p-6 ${embedded ? "" : "mt-8"}`}>
          <h2 className="mb-2 flex items-center gap-2 font-serif text-xl font-bold text-burgundy">
            <UserPlus className="h-5 w-5 text-gold-muted" />
            Invite a Member
          </h2>
          <p className="mb-6 text-sm text-burgundy/70">
            Search for an approved member — no long dropdown list. Only they can enter this private
            room.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="e.g. Prayer & counsel — follow-up"
            />
            <MemberSearchPicker
              value={invitedMember}
              onChange={setInvitedMember}
              placeholder="Search member by name or email..."
            />
          </div>
          <button
            type="button"
            disabled={!invitedMember || creating}
            onClick={() => void createSession()}
            className="btn-primary mt-4 inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Creating..." : "Create Private Session"}
          </button>
          {error ? (
            <p className="mt-3 text-sm text-burgundy">{error}</p>
          ) : null}

          {lastJoinUrl && (
            <div className="mt-4 rounded-xl border border-gold/30 bg-cream-dark p-4">
              <p className="text-sm font-semibold text-burgundy">Session created</p>
              <p className="mt-1 break-all text-sm text-burgundy/70">{lastJoinUrl}</p>
              <p className="mt-2 text-xs text-burgundy/60">
                Enter as host below to start — the member can open their link and will join when
                you&apos;re in.
              </p>
            </div>
          )}
        </section>
      )}

      <section className={embedded ? "mt-0" : "mt-8"}>
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
          <div className="space-y-6">
            {activeSessions.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-burgundy/55">
                  Active & scheduled ({activeSessions.length})
                </p>
                {isAdmin ? (
                  <PaginatedScrollList
                    items={activeSessions}
                    pageSize={5}
                    listClassName="space-y-4"
                    getKey={(s) => s.id}
                    renderItem={(s) => renderSessionCard(s)}
                  />
                ) : (
                  <ShowMoreList
                    items={activeSessions}
                    initialCount={5}
                    step={5}
                    listClassName="space-y-4"
                    getKey={(s) => s.id}
                    renderItem={(s) => renderSessionCard(s)}
                  />
                )}
              </div>
            )}

            {endedSessions.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-burgundy/55">
                  Past sessions ({endedSessions.length})
                </p>
                {isAdmin ? (
                  <PaginatedScrollList
                    items={endedSessions}
                    pageSize={5}
                    listClassName="space-y-4"
                    getKey={(s) => s.id}
                    renderItem={(s) => renderSessionCard(s)}
                  />
                ) : (
                  <ShowMoreList
                    items={endedSessions}
                    initialCount={3}
                    step={5}
                    listClassName="space-y-4"
                    getKey={(s) => s.id}
                    renderItem={(s) => renderSessionCard(s)}
                    moreLabel="past sessions"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {!isAdmin && !embedded && (
        <p className="mt-8 text-center text-sm text-burgundy/60">
          Welcome, {userName}. This space is only for sessions you&apos;re personally invited to —
          separate from the public live teaching at{" "}
          <AppPathLink href="/livestream" className="font-medium text-burgundy underline">
            Live Meeting
          </AppPathLink>
          .
        </p>
      )}
    </div>
  );
}
