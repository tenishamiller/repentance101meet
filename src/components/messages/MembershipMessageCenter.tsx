"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { MessageCircle, SendHorizontal } from "lucide-react";
import { BrandDivider } from "@/components/BrandDivider";
import { UserAvatar } from "@/components/UserAvatar";
import { MINISTRY_LEADER } from "@/lib/brand";
import { formatRequestDateTime } from "@/lib/utils";
import { scrollContainerToBottom } from "@/lib/chat-scroll";
import {
  MembershipMessageBubble,
  type MembershipMessageData,
} from "@/components/messages/MembershipMessageBubble";

type Thread = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status?: string;
  onboardingDueAt: string | null;
  questionnaireCompletedAt: string | null;
  unreadCount?: number;
  lastMessage?: { content: string; createdAt: string; type: string };
};

type MemberOption = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
};

type Props = {
  /** When true, renders inside Admin Console (sidebar threads, no page header). */
  embedded?: boolean;
  onUnreadChange?: (count: number) => void;
};

export function MembershipMessageCenter({ embedded = false, onUnreadChange }: Props) {
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = embedded || session?.user?.role === "ADMIN";
  const isPending = session?.user?.status === "PENDING";

  const [threads, setThreads] = useState<Thread[]>([]);
  const [allMembers, setAllMembers] = useState<MemberOption[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MembershipMessageData[]>([]);
  const [memberInfo, setMemberInfo] = useState<Record<string, unknown> | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  const threadUserId = isAdmin ? selectedUserId : session?.user?.id;

  const fetchInbox = useCallback(async () => {
    if (sessionStatus === "loading") return;

    if (isAdmin) {
      const threadRes = await fetch("/api/messages");
      if (threadRes.ok) {
        const data = await threadRes.json();
        const list: Thread[] = data.threads ?? [];
        setThreads(list);
        const totalUnread = list.reduce((sum, t) => sum + (t.unreadCount ?? 0), 0);
        onUnreadChange?.(totalUnread);
      }

      const unreadRes = await fetch("/api/messages/unread-count");
      if (unreadRes.ok) {
        const unreadData = await unreadRes.json();
        onUnreadChange?.(unreadData.unread ?? 0);
      }
    }

    if (isAdmin && !selectedUserId) {
      setMessages([]);
      setMemberInfo(null);
      setLoading(false);
      return;
    }

    const url =
      isAdmin && selectedUserId
        ? `/api/messages?userId=${selectedUserId}`
        : "/api/messages";

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
      setMemberInfo(data.member ?? null);
    }
    setLoading(false);
  }, [isAdmin, onUnreadChange, selectedUserId, sessionStatus]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void fetch("/api/admin/members?limit=500&status=ALL")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.members) setAllMembers(data.members);
      });
  }, [isAdmin]);

  useEffect(() => {
    void fetchInbox();
    const interval = setInterval(() => void fetchInbox(), 4000);
    return () => clearInterval(interval);
  }, [fetchInbox]);

  useEffect(() => {
    if (isAdmin && selectedUserId) {
      setLoading(true);
      setEditingId(null);
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
      "Remove this member's profile from the website? You can restore it within 30 days.",
    );
    if (!sure) return;
    const doubleCheck = window.confirm("Final confirmation: remove this profile?");
    if (!doubleCheck) return;
    await adminAction("deny", { confirm: true });
    setSelectedUserId(null);
  }

  async function saveEdit(messageId: string) {
    if (!editContent.trim()) return;
    setActionError("");
    const res = await fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(typeof data.error === "string" ? data.error : "Could not save edit.");
      return;
    }
    setEditingId(null);
    setEditContent("");
    void fetchInbox();
  }

  async function deleteMessage(messageId: string) {
    if (!window.confirm("Delete this message permanently? This cannot be undone.")) return;
    setActionError("");
    const res = await fetch(`/api/messages/${messageId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(typeof data.error === "string" ? data.error : "Could not delete message.");
      return;
    }
    void fetchInbox();
  }

  const shellClass = embedded
    ? "flex min-h-[min(70vh,720px)] flex-col"
    : "mx-auto flex h-mobile-app max-w-6xl flex-col px-3 py-4 sm:px-4 lg:h-[calc(100vh-80px)]";

  const searchLower = memberSearch.trim().toLowerCase();
  const filteredMembers = allMembers.filter((member) => {
    if (!searchLower) return true;
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower)
    );
  });

  const selectedMember =
    threads.find((thread) => thread.id === selectedUserId) ??
    allMembers.find((member) => member.id === selectedUserId) ??
    (memberInfo && selectedUserId
      ? {
          id: selectedUserId,
          name: String((memberInfo as { name?: string }).name ?? "Member"),
          email: String((memberInfo as { email?: string }).email ?? ""),
          avatarUrl: (memberInfo as { avatarUrl?: string | null }).avatarUrl ?? null,
        }
      : null);

  return (
    <div className={shellClass}>
      {!embedded && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-muted">
            Membership Messages
          </p>
          <h1 className="font-serif text-2xl font-bold text-burgundy sm:text-3xl">Messages</h1>
          <BrandDivider className="my-3 max-w-xs" />
          {isPending && (
            <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-burgundy">
              While your membership is pending, this is your only access on the site. Norman will
              message you here and send your required one-on-one approval meeting link.
            </div>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        {isAdmin && (
          <aside className="card-brand flex max-h-56 flex-col overflow-hidden p-3 lg:max-h-none lg:w-72 lg:shrink-0">
            <div className="mb-3 shrink-0 space-y-2">
              <label
                htmlFor="admin-member-picker"
                className="text-xs font-semibold uppercase tracking-wide text-burgundy/55"
              >
                Message a member
              </label>
              <input
                type="search"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="input-field text-sm"
              />
              <select
                id="admin-member-picker"
                value={selectedUserId ?? ""}
                onChange={(e) => setSelectedUserId(e.target.value || null)}
                className="input-field text-sm"
              >
                <option value="">Choose a member...</option>
                {filteredMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} · {member.email}
                    {member.status !== "APPROVED" ? ` (${member.status})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <h2 className="mb-2 shrink-0 text-sm font-semibold text-burgundy">Conversations</h2>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {threads.length === 0 ? (
                <p className="text-sm text-burgundy/60">No conversations yet.</p>
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
                          <span className="flex items-center gap-2">
                            <span className="block truncate text-sm font-semibold">{thread.name}</span>
                            {(thread.unreadCount ?? 0) > 0 && (
                              <span className="rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-burgundy-deep">
                                {thread.unreadCount}
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-xs opacity-70">{thread.email}</span>
                          {thread.lastMessage && (
                            <span className="mt-0.5 block truncate text-[11px] opacity-60">
                              {thread.lastMessage.content.slice(0, 60)}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}

        <div className="card-brand flex min-h-0 flex-1 flex-col overflow-hidden">
          {loading ? (
            <p className="p-6 text-center text-burgundy/60">Loading messages...</p>
          ) : (
            <>
              {isAdmin && selectedMember && (
                <div className="shrink-0 border-b border-gold/20 bg-cream-dark/80 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      userId={selectedMember.id}
                      name={selectedMember.name}
                      avatarUrl={selectedMember.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-burgundy">{selectedMember.name}</p>
                      <p className="truncate text-xs text-burgundy/60">{selectedMember.email}</p>
                    </div>
                  </div>
                </div>
              )}

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
                      Deny & Remove
                    </button>
                  </div>
                </div>
              )}

              <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                    <MessageCircle className="mb-3 h-10 w-10 text-gold-muted" />
                    <p className="text-burgundy/70">
                      {isAdmin
                        ? "Choose a member from the dropdown or pick a conversation to start messaging."
                        : `Message ${MINISTRY_LEADER} here. Your one-on-one invite will appear in this box.`}
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <MembershipMessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender.id === session?.user?.id}
                    editingId={editingId}
                    editContent={editContent}
                    onEditContentChange={setEditContent}
                    onStartEdit={() => {
                      setEditingId(msg.id);
                      setEditContent(msg.content);
                      setActionError("");
                    }}
                    onCancelEdit={() => {
                      setEditingId(null);
                      setEditContent("");
                    }}
                    onSaveEdit={() => void saveEdit(msg.id)}
                    onDelete={() => void deleteMessage(msg.id)}
                    now={now}
                  />
                ))}
              </div>

              {actionError && (
                <p className="shrink-0 border-t border-burgundy/20 bg-burgundy/5 px-4 py-2 text-center text-xs text-burgundy">
                  {actionError}
                </p>
              )}

              {memberInfo &&
                !isAdmin &&
                (memberInfo as { onboardingDueAt?: string }).onboardingDueAt && (
                  <p className="shrink-0 border-t border-gold/20 bg-gold/5 px-4 py-2 text-center text-xs text-burgundy/70">
                    Complete your meeting with Norman by{" "}
                    {formatRequestDateTime(
                      (memberInfo as { onboardingDueAt: string }).onboardingDueAt,
                    )}
                  </p>
                )}

              <form onSubmit={sendMessage} className="shrink-0 border-t border-gold/20 p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={isAdmin ? "Message this member..." : "Message Norman..."}
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
