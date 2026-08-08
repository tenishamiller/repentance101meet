"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { MessageCircle, SendHorizontal, Video } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { BrandDivider } from "@/components/BrandDivider";
import { MINISTRY_LEADER } from "@/lib/brand";
import { formatRequestDateTime } from "@/lib/utils";
import { isNearBottom, scrollContainerToBottom } from "@/lib/chat-scroll";

type Message = {
  id: string;
  content: string;
  type: "TEXT" | "ONBOARDING_INVITE" | "SYSTEM";
  createdAt: string;
  sender: { id: string; name: string; avatarUrl: string | null; role: string };
  meeting?: {
    id: string;
    linkToken: string;
    title: string;
    status: string;
    isOnboardingApproval: boolean;
  } | null;
};

type Thread = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  onboardingDueAt: string | null;
  questionnaireCompletedAt: string | null;
  membershipThread: { content: string; createdAt: string; type: string }[];
};

export function MembershipMessageCenter() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const isPending = session?.user?.status === "PENDING";

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [memberInfo, setMemberInfo] = useState<Record<string, unknown> | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const threadUserId = isAdmin ? selectedUserId : session?.user?.id;

  const fetchInbox = useCallback(async () => {
    if (isAdmin && !selectedUserId) {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads ?? []);
        if (!selectedUserId && data.threads?.[0]) {
          setSelectedUserId(data.threads[0].id);
        }
      }
      setLoading(false);
      return;
    }

    const url = isAdmin && selectedUserId
      ? `/api/messages?userId=${selectedUserId}`
      : "/api/messages";

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
      setMemberInfo(data.member ?? null);
    }
    setLoading(false);
  }, [isAdmin, selectedUserId]);

  useEffect(() => {
    void fetchInbox();
    const interval = setInterval(() => void fetchInbox(), 4000);
    return () => clearInterval(interval);
  }, [fetchInbox]);

  useEffect(() => {
    if (isAdmin && selectedUserId) {
      setLoading(true);
      void fetchInbox();
    }
  }, [isAdmin, selectedUserId, fetchInbox]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) scrollContainerToBottom(node);
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !threadUserId) return;
    setSending(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim(), threadUserId }),
    });
    setContent("");
    setSending(false);
    void fetchInbox();
  }

  async function adminAction(action: string, extra: Record<string, unknown> = {}) {
    if (!selectedUserId) return;
    setActionLoading(true);
    await fetch("/api/admin/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId: selectedUserId, ...extra }),
    });
    setActionLoading(false);
    void fetchInbox();
  }

  async function denyMember() {
    if (!selectedUserId) return;
    const sure = window.confirm(
      "Are you sure you want to deny this membership and permanently delete their account? This cannot be undone.",
    );
    if (!sure) return;
    const doubleCheck = window.confirm(
      "Final confirmation: Delete this member's account now?",
    );
    if (!doubleCheck) return;
    await adminAction("deny", { confirm: true });
    setSelectedUserId(null);
  }

  return (
    <div className="mx-auto flex h-mobile-app max-w-6xl flex-col px-3 py-4 sm:px-4 lg:h-[calc(100vh-80px)]">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-muted">
          Membership Messages
        </p>
        <h1 className="font-serif text-2xl font-bold text-burgundy sm:text-3xl">
          {isAdmin ? "Member Conversations" : "Messages with Norman"}
        </h1>
        <BrandDivider className="my-3 max-w-xs" />
        {isPending && (
          <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-burgundy">
            While your membership is pending, this is your only access on the site. Norman will
            message you here and send your required one-on-one approval meeting link.
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        {isAdmin && (
          <aside className="card-brand max-h-48 overflow-y-auto p-3 lg:max-h-none lg:w-72 lg:shrink-0">
            <h2 className="mb-2 text-sm font-semibold text-burgundy">Waiting for one-on-one</h2>
            {threads.length === 0 ? (
              <p className="text-sm text-burgundy/60">No pending questionnaires yet.</p>
            ) : (
              <ul className="space-y-2">
                {threads.map((thread) => (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedUserId(thread.id)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
                        selectedUserId === thread.id
                          ? "bg-burgundy text-cream"
                          : "hover:bg-cream-dark"
                      }`}
                    >
                      <UserAvatar
                        userId={thread.id}
                        name={thread.name}
                        avatarUrl={thread.avatarUrl}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{thread.name}</span>
                        <span className="block truncate text-xs opacity-70">{thread.email}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}

        <div className="card-brand flex min-h-0 flex-1 flex-col overflow-hidden">
          {loading ? (
            <p className="p-6 text-center text-burgundy/60">Loading messages...</p>
          ) : (
            <>
              {isAdmin && selectedUserId && (
                <div className="shrink-0 border-b border-gold/20 bg-cream-dark/80 p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void adminAction("start")}
                      className="rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-burgundy hover:bg-gold/10 sm:text-sm"
                    >
                      Start Session
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void adminAction("invite")}
                      className="btn-primary !px-3 !py-2 text-xs sm:text-sm"
                    >
                      Send 1-on-1 Invite
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void denyMember()}
                      className="rounded-xl border border-burgundy/40 bg-burgundy/10 px-3 py-2 text-xs font-semibold text-burgundy hover:bg-burgundy/15 sm:text-sm"
                    >
                      Deny & Delete Account
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-burgundy/55">
                    Send the membership approval one-on-one invite, or deny and remove the account.
                  </p>
                </div>
              )}

              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                    <MessageCircle className="mb-3 h-10 w-10 text-gold-muted" />
                    <p className="text-burgundy/70">
                      {isAdmin
                        ? "Select a member to view their thread with you."
                        : `Message ${MINISTRY_LEADER} here. Your one-on-one invite will appear in this box.`}
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.sender.id === session?.user?.id ? "flex-row-reverse" : ""}`}
                  >
                    <UserAvatar
                      userId={msg.sender.id}
                      name={msg.sender.name}
                      avatarUrl={msg.sender.avatarUrl}
                      size="md"
                    />
                    <div
                      className={`max-w-[min(100%,36rem)] rounded-2xl px-4 py-3 ${
                        msg.type === "ONBOARDING_INVITE"
                          ? "border-2 border-gold bg-gold/15"
                          : msg.type === "SYSTEM"
                            ? "border border-gold/30 bg-cream-dark"
                            : msg.sender.role === "ADMIN"
                              ? "border border-gold/25 bg-white"
                              : "border border-gold/20 bg-cream"
                      }`}
                    >
                      {msg.type === "ONBOARDING_INVITE" && (
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-burgundy">
                          Membership Approval — Required One-on-One
                        </p>
                      )}
                      <p className="whitespace-pre-wrap text-sm text-burgundy/90">{msg.content}</p>
                      {msg.meeting && (
                        <Link
                          href={`/personal-ministry/${msg.meeting.linkToken}`}
                          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-burgundy px-4 py-2 text-sm font-semibold text-cream hover:bg-burgundy-dark"
                        >
                          <Video className="h-4 w-4" />
                          {msg.meeting.status === "LIVE"
                            ? "Join One-on-One Now"
                            : "Open One-on-One Session"}
                        </Link>
                      )}
                      <p className="mt-2 text-[11px] text-burgundy/45">
                        {formatRequestDateTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {memberInfo && !isAdmin && (memberInfo as { onboardingDueAt?: string }).onboardingDueAt && (
                <p className="shrink-0 border-t border-gold/20 bg-gold/5 px-4 py-2 text-center text-xs text-burgundy/70">
                  Complete your meeting with Norman by{" "}
                  {formatRequestDateTime((memberInfo as { onboardingDueAt: string }).onboardingDueAt)}
                </p>
              )}

              <form
                onSubmit={sendMessage}
                className="shrink-0 border-t border-gold/20 p-3"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      isAdmin ? "Message this member..." : "Message Norman..."
                    }
                    className="input-field flex-1"
                    disabled={isAdmin && !selectedUserId}
                  />
                  <button
                    type="submit"
                    disabled={sending || !content.trim() || (isAdmin && !selectedUserId)}
                    className="btn-primary flex shrink-0 items-center gap-2 !px-4 disabled:opacity-50"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
