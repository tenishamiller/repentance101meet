"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Ban, ClipboardPaste, MessageCircle, Paperclip, SendHorizontal, UserMinus, X } from "lucide-react";
import { BrandDivider } from "@/components/BrandDivider";
import { UserAvatar } from "@/components/UserAvatar";
import { EmojiPicker } from "@/components/channels/EmojiPicker";
import { MINISTRY_LEADER } from "@/lib/brand";
import { formatRequestDateTime, type Attachment } from "@/lib/utils";
import { scrollContainerToBottom } from "@/lib/chat-scroll";
import { uploadDirectAttachment } from "@/lib/direct-upload";
import {
  MESSAGE_MAX_ATTACHMENTS,
  collectMediaAttachmentsFromText,
  fileTooLargeError,
  filesFromClipboard,
  maxBytesForFile,
  normalizeClipboardFile,
} from "@/lib/message-attachments";
import { useAppBase } from "@/hooks/useAppBase";
import { useMessagePagination } from "@/hooks/useMessagePagination";
import { MessagePagination } from "@/components/messages/MessagePagination";
import {
  ThreadOverflowMenu,
  type DeletedThreadSummary,
} from "@/components/messages/ThreadOverflowMenu";
import {
  MembershipMessageBubble,
  type MembershipMessageData,
} from "@/components/messages/MembershipMessageBubble";

type Thread = {
  id: string;
  conversationId?: string;
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

type PeerMember = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  conversationId?: string | null;
  blockedByMe: boolean;
  blockedMe: boolean;
  pendingOutgoing: boolean;
  pendingIncoming: boolean;
  approved: boolean;
  canMessage: boolean;
  unreadCount: number;
  lastMessage: { content: string; createdAt: string } | null;
};

type DmRelation = {
  canMessage: boolean;
  blockedByMe: boolean;
  blockedMe: boolean;
  pendingOutgoing: boolean;
  pendingIncoming: boolean;
  approved: boolean;
};

type Props = {
  /** When true, renders inside Admin Console (sidebar threads, no page header). */
  embedded?: boolean;
  onUnreadChange?: (count: number) => void;
};

export function MembershipMessageCenter({ embedded = false, onUnreadChange }: Props) {
  const { data: session, status: sessionStatus } = useSession();
  const appBase = useAppBase();
  const inMobileShell = appBase === "/m";
  const isAdmin = embedded || session?.user?.role === "ADMIN";
  const isPending = session?.user?.status === "PENDING";
  const isPeerMessaging =
    !isAdmin && session?.user?.role === "MEMBER" && session.user.status === "APPROVED";

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
  const [uploadError, setUploadError] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [peerMembers, setPeerMembers] = useState<PeerMember[]>([]);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerRelation, setPeerRelation] = useState<DmRelation | null>(null);
  const [peerSearch, setPeerSearch] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [deletedThreads, setDeletedThreads] = useState<DeletedThreadSummary[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fetchSeqRef = useRef(0);

  const threadUserId = isAdmin ? selectedUserId : session?.user?.id;
  const messagingPeer = isPeerMessaging && Boolean(peerId);
  const messageThreadKey = messagingPeer
    ? `peer:${peerId ?? "none"}`
    : isAdmin
      ? `admin:${selectedUserId ?? "none"}`
      : `member:${session?.user?.id ?? "none"}`;

  const messagePagination = useMessagePagination(messages, messageThreadKey);
  const visibleMessages = messagePagination.paginatedMessages;

  const fetchDeletedThreads = useCallback(async () => {
    if (isAdmin) {
      const res = await fetch("/api/messages?deleted=1");
      if (res.ok) {
        const data = await res.json();
        setDeletedThreads((data.threads ?? []) as DeletedThreadSummary[]);
      }
      return;
    }

    if (isPeerMessaging) {
      const [ministryRes, peerRes] = await Promise.all([
        fetch("/api/messages?deleted=1"),
        fetch("/api/member-messages?deleted=1"),
      ]);
      const threads: DeletedThreadSummary[] = [];
      if (ministryRes.ok) {
        const data = await ministryRes.json();
        threads.push(...((data.threads ?? []) as DeletedThreadSummary[]));
      }
      if (peerRes.ok) {
        const data = await peerRes.json();
        threads.push(...((data.threads ?? []) as DeletedThreadSummary[]));
      }
      setDeletedThreads(threads);
      return;
    }

    const res = await fetch("/api/messages?deleted=1");
    if (res.ok) {
      const data = await res.json();
      setDeletedThreads((data.threads ?? []) as DeletedThreadSummary[]);
    }
  }, [isAdmin, isPeerMessaging]);

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

    void fetchDeletedThreads();

    if (isAdmin && !selectedUserId) {
      setMessages([]);
      setMemberInfo(null);
      setActiveConversationId(null);
      setLoading(false);
      return;
    }

    if (isPeerMessaging) {
      const dirRes = await fetch("/api/member-messages");
      if (dirRes.ok) {
        const data = await dirRes.json();
        setPeerMembers(data.members ?? []);
      }

      if (peerId) {
        const seq = ++fetchSeqRef.current;
        const res = await fetch(`/api/member-messages?userId=${encodeURIComponent(peerId)}`);
        if (res.ok && seq === fetchSeqRef.current) {
          const data = await res.json();
          setMessages(data.messages ?? []);
          setPeerRelation(data.relation ?? null);
          setMemberInfo(data.member ?? null);
          setActiveConversationId(data.conversation?.id ?? null);
        }
        if (seq === fetchSeqRef.current) setLoading(false);
        return;
      }

      setPeerRelation(null);
      const seq = ++fetchSeqRef.current;
      const res = await fetch("/api/messages");
      if (res.ok && seq === fetchSeqRef.current) {
        const data = await res.json();
        setMessages(data.messages ?? []);
        setMemberInfo(data.member ?? null);
        setActiveConversationId(data.conversation?.id ?? null);
      }
      if (seq === fetchSeqRef.current) setLoading(false);
      return;
    }

    const url =
      isAdmin && selectedUserId
        ? `/api/messages?userId=${selectedUserId}`
        : "/api/messages";

    const seq = ++fetchSeqRef.current;
    const res = await fetch(url);
    if (res.ok && seq === fetchSeqRef.current) {
      const data = await res.json();
      setMessages(data.messages ?? []);
      setMemberInfo(data.member ?? null);
      setActiveConversationId(data.conversation?.id ?? null);
    }
    if (seq === fetchSeqRef.current) {
      setLoading(false);
    }
  }, [
    fetchDeletedThreads,
    isAdmin,
    isPeerMessaging,
    onUnreadChange,
    peerId,
    selectedUserId,
    sessionStatus,
  ]);

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
    if (isPeerMessaging) {
      setLoading(true);
      setEditingId(null);
      void fetchInbox();
    }
  }, [isPeerMessaging, peerId, fetchInbox]);

  useEffect(() => {
    if (!messagePagination.onLatestPage) return;
    const node = scrollRef.current;
    if (node) scrollContainerToBottom(node);
  }, [messages, messagePagination.onLatestPage]);

  async function uploadFile(file: File): Promise<Attachment | null> {
    const uploaded = await uploadDirectAttachment(file);
    if ("error" in uploaded) {
      setUploadError(uploaded.error);
      return null;
    }
    return uploaded;
  }

  function addPendingFiles(files: File[]) {
    if (files.length === 0) return;
    setUploadError("");
    const accepted: File[] = [];
    for (const file of files) {
      if (file.size > maxBytesForFile(file)) {
        setUploadError(fileTooLargeError(file));
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return;
    setPendingFiles((current) => [...current, ...accepted].slice(0, MESSAGE_MAX_ATTACHMENTS));
  }

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    addPendingFiles(files);
  }

  function handlePaste(event: React.ClipboardEvent) {
    const files = filesFromClipboard(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    addPendingFiles(files);
  }

  async function pasteFromClipboard() {
    setUploadError("");
    try {
      if (!navigator.clipboard?.read) {
        setUploadError("Paste a screenshot with Ctrl+V (or Cmd+V), or attach a file.");
        return;
      }
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        const type = item.types.find(
          (value) => value.startsWith("image/") || value.startsWith("video/"),
        );
        if (!type) continue;
        const blob = await item.getType(type);
        files.push(normalizeClipboardFile(new File([blob], "image.png", { type })));
      }
      if (files.length === 0) {
        setUploadError("No screenshot or image on the clipboard. Copy one, then paste here.");
        return;
      }
      addPendingFiles(files);
    } catch {
      setUploadError("Paste a screenshot with Ctrl+V (or Cmd+V), or attach a file.");
    }
  }

  function insertEmoji(emoji: string) {
    setContent((prev) => prev + emoji);
  }

  function clearPendingFiles() {
    setPendingFiles([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!content.trim() && pendingFiles.length === 0) || (!messagingPeer && !threadUserId)) return;
    if (messagingPeer && !peerRelation?.canMessage) return;
    setSending(true);
    setActionError("");
    setUploadError("");

    const attachments: Attachment[] = [];
    for (const file of pendingFiles) {
      const attachment = await uploadFile(file);
      if (attachment) attachments.push(attachment);
    }

    let trimmed = content.trim();
    for (const extra of collectMediaAttachmentsFromText(trimmed)) {
      if (attachments.length >= MESSAGE_MAX_ATTACHMENTS) break;
      if (attachments.some((item) => item.url === extra.url)) continue;
      attachments.push(extra);
    }
    if (attachments.length === 1 && trimmed === attachments[0].url) {
      trimmed = "";
    }

    if (!trimmed && attachments.length === 0) {
      setSending(false);
      return;
    }

    const res = await fetch(messagingPeer ? "/api/member-messages" : "/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        messagingPeer
          ? {
              content: trimmed,
              userId: peerId,
              attachments: attachments.length > 0 ? attachments : undefined,
            }
          : {
              content: trimmed,
              threadUserId,
              attachments: attachments.length > 0 ? attachments : undefined,
            },
      ),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(typeof data.error === "string" ? data.error : "Could not send message.");
      setSending(false);
      return;
    }
    setContent("");
    clearPendingFiles();
    setSending(false);
    void fetchInbox();
  }

  async function adminAction(action: string, extra: Record<string, unknown> = {}) {
    if (!selectedUserId) return;
    setActionLoading(true);
    setActionError("");
    const res = await fetch("/api/admin/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId: selectedUserId, ...extra }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(typeof data.error === "string" ? data.error : "Action failed.");
      setActionLoading(false);
      return;
    }
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

  async function softDeleteThread(conversationId: string) {
    setActionError("");
    setBusyAction(`soft-delete:${conversationId}`);
    const res = await fetch(`/api/messages/conversations/${conversationId}`, {
      method: "DELETE",
    });
    setBusyAction(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(typeof data.error === "string" ? data.error : "Could not delete thread.");
      return;
    }
    if (activeConversationId === conversationId) {
      setMessages([]);
      setActiveConversationId(null);
    }
    void fetchInbox();
  }

  async function restoreThread(conversationId: string) {
    setActionError("");
    setBusyAction(`restore:${conversationId}`);
    const res = await fetch(`/api/messages/conversations/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    setBusyAction(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(typeof data.error === "string" ? data.error : "Could not restore thread.");
      return;
    }
    void fetchInbox();
  }

  async function permanentlyDeleteThread(conversationId: string) {
    setActionError("");
    setBusyAction(`purge:${conversationId}`);
    const res = await fetch(`/api/messages/conversations/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "purge", confirmPermanent: true }),
    });
    setBusyAction(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(
        typeof data.error === "string" ? data.error : "Could not permanently delete thread.",
      );
      return;
    }
    void fetchInbox();
  }

  async function peerAction(path: string, extra: Record<string, unknown> = {}) {
    if (!peerId) return;
    setActionLoading(true);
    setActionError("");
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: peerId, ...extra }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(typeof data.error === "string" ? data.error : "Could not update.");
      setActionLoading(false);
      return;
    }
    setActionLoading(false);
    void fetchInbox();
  }

  const shellClass = embedded
    ? "flex min-h-[min(70vh,720px)] flex-col"
    : inMobileShell
      ? "mx-auto flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-4"
      : "mx-auto flex h-mobile-app min-h-0 max-w-6xl flex-col px-3 py-4 sm:px-4 lg:h-[calc(100vh-80px)]";

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

  const peerSearchLower = peerSearch.trim().toLowerCase();
  const filteredPeers = peerMembers.filter((member) => {
    if (!peerSearchLower) return true;
    return (
      member.name.toLowerCase().includes(peerSearchLower) ||
      member.email.toLowerCase().includes(peerSearchLower)
    );
  });
  const selectedPeer = peerMembers.find((member) => member.id === peerId) ?? null;

  const deletedForSidebar = deletedThreads;

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
        {isPeerMessaging && (
          <aside className="card-brand flex max-h-64 flex-col overflow-hidden p-3 lg:max-h-none lg:w-72 lg:shrink-0">
            <button
              type="button"
              onClick={() => setPeerId(null)}
              className={`mb-3 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold ${
                !peerId ? "bg-burgundy text-cream" : "hover:bg-cream-dark text-burgundy"
              }`}
            >
              Ministry leadership
            </button>
            <label className="text-xs font-semibold uppercase tracking-wide text-burgundy/55">
              Members
            </label>
            <input
              type="search"
              value={peerSearch}
              onChange={(e) => setPeerSearch(e.target.value)}
              placeholder="Search members..."
              className="input-field mt-2 mb-2 text-sm"
            />
            <div className="chat-scroll min-h-0 flex-1">
              {filteredPeers.length === 0 ? (
                <p className="text-sm text-burgundy/60">No members yet.</p>
              ) : (
                <ul className="space-y-1">
                  {filteredPeers.map((member) => (
                    <li key={member.id} className="flex items-stretch gap-1">
                      <button
                        type="button"
                        onClick={() => setPeerId(member.id)}
                        className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
                          peerId === member.id
                            ? "bg-burgundy text-cream"
                            : "hover:bg-cream-dark"
                        }`}
                      >
                        <UserAvatar
                          userId={member.id}
                          name={member.name}
                          avatarUrl={member.avatarUrl}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="block truncate text-sm font-semibold">{member.name}</span>
                            {member.pendingIncoming && (
                              <span className="rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-burgundy-deep">
                                Request
                              </span>
                            )}
                            {member.unreadCount > 0 && (
                              <span className="rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-burgundy-deep">
                                {member.unreadCount}
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-[11px] opacity-70">
                            {member.blockedByMe
                              ? "Blocked"
                              : member.pendingOutgoing
                                ? "Waiting for approval"
                                : member.canMessage
                                  ? member.lastMessage?.content || "Conversation open"
                                  : "Tap to request"}
                          </span>
                        </span>
                      </button>
                      {member.conversationId && (
                        <div className="flex items-center pr-1">
                          <ThreadOverflowMenu
                            mode="active"
                            conversationName={member.name}
                            busy={busyAction === `soft-delete:${member.conversationId}`}
                            onDeleteThread={() => softDeleteThread(member.conversationId!)}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {deletedForSidebar.length > 0 && (
                <div className="mt-4 border-t border-gold/20 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-burgundy/55">
                    Deleted threads
                  </p>
                  <ul className="space-y-1">
                    {deletedForSidebar.map((thread) => (
                      <li
                        key={thread.conversationId}
                        className="flex items-center gap-1 rounded-xl bg-cream-dark/80 px-2 py-1.5"
                      >
                        <div className="min-w-0 flex-1 px-1">
                          <p className="truncate text-sm font-semibold text-burgundy/80">
                            {thread.name}
                          </p>
                          <p className="truncate text-[11px] text-burgundy/50">
                            {thread.lastMessage?.content?.trim() || "Deleted conversation"}
                          </p>
                        </div>
                        <ThreadOverflowMenu
                          mode="deleted"
                          conversationName={thread.name}
                          purgeAt={thread.conversation.purgeAt}
                          busy={
                            busyAction === `restore:${thread.conversationId}` ||
                            busyAction === `purge:${thread.conversationId}`
                          }
                          onRestore={() => restoreThread(thread.conversationId)}
                          onPermanentDelete={() => permanentlyDeleteThread(thread.conversationId)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        )}

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
            <div className="chat-scroll min-h-0 flex-1">
              {threads.length === 0 ? (
                <p className="text-sm text-burgundy/60">No conversations yet.</p>
              ) : (
                <ul className="space-y-2">
                  {threads.map((thread) => (
                    <li key={thread.id} className="flex items-stretch gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(thread.id)}
                        className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
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
                              {thread.lastMessage.content.trim()
                                ? thread.lastMessage.content.slice(0, 60)
                                : "📎 Attachment"}
                            </span>
                          )}
                        </span>
                      </button>
                      {thread.conversationId && (
                        <div className="flex items-center pr-1">
                          <ThreadOverflowMenu
                            mode="active"
                            conversationName={thread.name}
                            busy={busyAction === `soft-delete:${thread.conversationId}`}
                            onDeleteThread={() => softDeleteThread(thread.conversationId!)}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {deletedForSidebar.length > 0 && (
                <div className="mt-4 border-t border-gold/20 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-burgundy/55">
                    Deleted threads
                  </p>
                  <ul className="space-y-1">
                    {deletedForSidebar.map((thread) => (
                      <li
                        key={thread.conversationId}
                        className="flex items-center gap-1 rounded-xl bg-cream-dark/80 px-2 py-1.5"
                      >
                        <div className="min-w-0 flex-1 px-1">
                          <p className="truncate text-sm font-semibold text-burgundy/80">
                            {thread.name}
                          </p>
                          <p className="truncate text-[11px] text-burgundy/50">
                            {thread.lastMessage?.content?.trim() || "Deleted conversation"}
                          </p>
                        </div>
                        <ThreadOverflowMenu
                          mode="deleted"
                          conversationName={thread.name}
                          purgeAt={thread.conversation.purgeAt}
                          busy={
                            busyAction === `restore:${thread.conversationId}` ||
                            busyAction === `purge:${thread.conversationId}`
                          }
                          onRestore={() => restoreThread(thread.conversationId)}
                          onPermanentDelete={() => permanentlyDeleteThread(thread.conversationId)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        )}

        <div className="card-brand flex min-h-0 flex-1 flex-col overflow-hidden">
          {loading ? (
            <p className="p-6 text-center text-burgundy/60">Loading messages...</p>
          ) : (
            <>
              {isPeerMessaging && selectedPeer && (
                <div className="shrink-0 border-b border-gold/20 bg-cream-dark/80 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        userId={selectedPeer.id}
                        name={selectedPeer.name}
                        avatarUrl={selectedPeer.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-burgundy">{selectedPeer.name}</p>
                        <p className="truncate text-xs text-burgundy/60">
                          {peerRelation?.blockedByMe
                            ? "Blocked"
                            : peerRelation?.blockedMe
                              ? "This member blocked you"
                              : peerRelation?.canMessage
                                ? "You can message each other"
                                : peerRelation?.pendingIncoming
                                  ? "Wants to message you"
                                  : peerRelation?.pendingOutgoing
                                    ? "Waiting for their approval"
                                    : "Needs their approval to message"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {activeConversationId && (
                        <ThreadOverflowMenu
                          mode="active"
                          conversationName={selectedPeer.name}
                          busy={busyAction === `soft-delete:${activeConversationId}`}
                          onDeleteThread={() => softDeleteThread(activeConversationId)}
                        />
                      )}
                      {peerRelation?.pendingIncoming && (
                        <>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => void peerAction("/api/member-messages/respond", { action: "approve" })}
                            className="btn-primary !px-3 !py-2 text-xs sm:text-sm"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => void peerAction("/api/member-messages/respond", { action: "decline" })}
                            className="rounded-xl border border-burgundy/30 px-3 py-2 text-xs font-semibold text-burgundy hover:bg-burgundy/10 sm:text-sm"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {!peerRelation?.canMessage &&
                        !peerRelation?.pendingIncoming &&
                        !peerRelation?.pendingOutgoing &&
                        !peerRelation?.blockedByMe &&
                        !peerRelation?.blockedMe && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => void peerAction("/api/member-messages/request")}
                            className="btn-primary !px-3 !py-2 text-xs sm:text-sm"
                          >
                            Request to message
                          </button>
                        )}
                      {peerRelation?.canMessage && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Remove this person from messaging you? They are not blocked and can request again.",
                              )
                            ) {
                              void peerAction("/api/member-messages/remove");
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-burgundy hover:bg-gold/10 sm:text-sm"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                      {!peerRelation?.blockedMe && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void peerAction("/api/member-messages/block")}
                          className="inline-flex items-center gap-1 rounded-xl border border-burgundy/30 px-3 py-2 text-xs font-semibold text-burgundy hover:bg-burgundy/10 sm:text-sm"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          {peerRelation?.blockedByMe ? "Unblock" : "Block"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isPeerMessaging && !selectedPeer && (
                <div className="shrink-0 border-b border-gold/20 bg-cream-dark/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-burgundy">Ministry leadership</p>
                      <p className="truncate text-xs text-burgundy/60">
                        Messages with Norman
                      </p>
                    </div>
                    {activeConversationId && (
                      <ThreadOverflowMenu
                        mode="active"
                        conversationName={MINISTRY_LEADER}
                        busy={busyAction === `soft-delete:${activeConversationId}`}
                        onDeleteThread={() => softDeleteThread(activeConversationId)}
                      />
                    )}
                  </div>
                </div>
              )}

              {!isAdmin && !isPeerMessaging && (
                <div className="shrink-0 border-b border-gold/20 bg-cream-dark/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-burgundy">Ministry leadership</p>
                      <p className="truncate text-xs text-burgundy/60">Membership messages</p>
                    </div>
                    {activeConversationId && (
                      <ThreadOverflowMenu
                        mode="active"
                        conversationName={MINISTRY_LEADER}
                        busy={busyAction === `soft-delete:${activeConversationId}`}
                        onDeleteThread={() => softDeleteThread(activeConversationId)}
                      />
                    )}
                  </div>
                </div>
              )}

              {isAdmin && selectedMember && (
                <div className="shrink-0 border-b border-gold/20 bg-cream-dark/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
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
                    {activeConversationId && (
                      <ThreadOverflowMenu
                        mode="active"
                        conversationName={selectedMember.name}
                        busy={busyAction === `soft-delete:${activeConversationId}`}
                        onDeleteThread={() => softDeleteThread(activeConversationId)}
                      />
                    )}
                  </div>
                </div>
              )}

              {!isAdmin && !isPeerMessaging && deletedThreads.length > 0 && (
                <div className="shrink-0 border-b border-gold/20 bg-cream-dark/50 px-4 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-burgundy/55">
                    Deleted threads
                  </p>
                  <ul className="space-y-1">
                    {deletedThreads.map((thread) => (
                      <li
                        key={thread.conversationId}
                        className="flex items-center gap-2 rounded-xl border border-gold/20 bg-cream px-2 py-1.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-burgundy">{thread.name}</p>
                          <p className="truncate text-[11px] text-burgundy/50">
                            {thread.lastMessage?.content?.trim() || "Deleted conversation"}
                          </p>
                        </div>
                        <ThreadOverflowMenu
                          mode="deleted"
                          conversationName={thread.name}
                          purgeAt={thread.conversation.purgeAt}
                          busy={
                            busyAction === `restore:${thread.conversationId}` ||
                            busyAction === `purge:${thread.conversationId}`
                          }
                          onRestore={() => restoreThread(thread.conversationId)}
                          onPermanentDelete={() => permanentlyDeleteThread(thread.conversationId)}
                        />
                      </li>
                    ))}
                  </ul>
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

              <MessagePagination
                page={messagePagination.page}
                totalPages={messagePagination.totalPages}
                total={messagePagination.total}
                pageSize={messagePagination.pageSize}
                onPageChange={messagePagination.setPage}
              />

              <div ref={scrollRef} className="chat-scroll min-h-0 flex-1 space-y-4 p-4">
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                    <MessageCircle className="mb-3 h-10 w-10 text-gold-muted" />
                    <p className="text-burgundy/70">
                      {isAdmin
                        ? "Choose a member from the dropdown or pick a conversation to start messaging."
                        : messagingPeer
                          ? peerRelation?.canMessage
                            ? "Send a first message, photo, GIF, or video."
                            : "Request approval before sending messages."
                          : `Message ${MINISTRY_LEADER} here. Your one-on-one invite will appear in this box.`}
                    </p>
                  </div>
                )}

                {visibleMessages.map((msg) => (
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
                    now={now}
                    allowEdit={!messagingPeer}
                    viewerIsAdmin={isAdmin}
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
                !messagingPeer &&
                (memberInfo as { onboardingDueAt?: string }).onboardingDueAt && (
                  <p className="shrink-0 border-t border-gold/20 bg-gold/5 px-4 py-2 text-center text-xs text-burgundy/70">
                    Complete your meeting with Norman by{" "}
                    {formatRequestDateTime(
                      (memberInfo as { onboardingDueAt: string }).onboardingDueAt,
                    )}
                  </p>
                )}

              {(!messagingPeer || peerRelation?.canMessage) && (
              <form onSubmit={sendMessage} onPaste={handlePaste} className="shrink-0 border-t border-gold/20 p-3">
                {uploadError && (
                  <p className="mb-2 text-xs text-burgundy">{uploadError}</p>
                )}
                {pendingFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {pendingFiles.map((file, index) => (
                      <PendingAttachmentChip
                        key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                        file={file}
                        onRemove={() =>
                          setPendingFiles((current) => current.filter((_, i) => i !== index))
                        }
                      />
                    ))}
                    <button
                      type="button"
                      onClick={clearPendingFiles}
                      className="text-xs text-burgundy/60 hover:text-burgundy"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/gif,image/*,video/*,audio/*,.gif,.mp4,.webm,.mov,.pdf,.doc,.docx,.txt,.zip"
                  className="hidden"
                  id="membership-message-file"
                  onChange={handleFilesSelected}
                />
                <div className="flex items-end gap-2">
                  <label
                    htmlFor="membership-message-file"
                    className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-gold/30 bg-cream-dark text-burgundy hover:bg-gold/10"
                    title="Attach a photo, GIF, video, or file (max 10 MB; videos up to 25 MB)"
                  >
                    <Paperclip className="h-4 w-4" />
                  </label>
                  <button
                    type="button"
                    onClick={() => void pasteFromClipboard()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-cream-dark text-burgundy hover:bg-gold/10"
                    title="Paste screenshot or copied image"
                  >
                    <ClipboardPaste className="h-4 w-4" />
                  </button>
                  <EmojiPicker
                    onSelect={insertEmoji}
                    buttonClassName="h-11 w-11 rounded-xl border-gold/30 bg-cream-dark"
                  />
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder={
                      isAdmin
                        ? "Message this member..."
                        : messagingPeer
                          ? "Message this member..."
                          : "Message Norman..."
                    }
                    rows={1}
                    className="input-field max-h-32 min-h-[44px] flex-1 resize-none py-2.5"
                    disabled={(isAdmin && !selectedUserId) || (messagingPeer && !peerRelation?.canMessage)}
                  />
                  <button
                    type="submit"
                    disabled={
                      sending ||
                      (!content.trim() && pendingFiles.length === 0) ||
                      (isAdmin && !selectedUserId) ||
                      (messagingPeer && !peerRelation?.canMessage)
                    }
                    className="btn-primary flex h-11 shrink-0 items-center gap-2 !px-4 disabled:opacity-50"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
                <p className="mt-2 text-center text-[11px] text-burgundy/45">
                  Photos, GIFs, and videos · Paste a screenshot with Ctrl+V (Cmd+V on Mac)
                </p>
              </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingAttachmentChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-gold/30 bg-cream-dark py-1 pl-1 pr-2 text-xs text-burgundy/80">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <span className="pl-1.5" aria-hidden>
          {file.type.startsWith("video/") ? "🎬" : "📎"}
        </span>
      )}
      <span className="max-w-[9rem] truncate">{file.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-burgundy/45 hover:bg-burgundy/10 hover:text-burgundy"
        aria-label={`Remove ${file.name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
