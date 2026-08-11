"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { canEditMessage, type Attachment } from "@/lib/utils";
import { uploadMeetingChatFile } from "@/lib/meeting-chat-upload";
import { getEditTimeRemaining, isMessageEdited } from "@/lib/channel-messages";
import { isNearBottom, scrollContainerToBottom } from "@/lib/chat-scroll";
import { MEETING_POLL } from "@/lib/meeting-poll-intervals";
import { useVisibilityPolling } from "@/hooks/useVisibilityPolling";

export type MeetingChatMessage = {
  id: string;
  content: string;
  attachments: Attachment[] | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  user: { id: string; name: string; avatarUrl: string | null };
};

type Options = {
  meetingToken: string;
  userId: string;
  isAdmin: boolean;
};

export function useMeetingChat({ meetingToken, userId, isAdmin }: Options) {
  const [messages, setMessages] = useState<MeetingChatMessage[]>([]);
  const [canModerate, setCanModerate] = useState(isAdmin);
  const [content, setContent] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stickToBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);
  const lastMessageAtRef = useRef<string | null>(null);

  const canSend = content.trim().length > 0 || pendingFiles.length > 0;

  const fetchMessages = useCallback(async () => {
    const since = lastMessageAtRef.current;
    const url = since
      ? `/api/meetings/${meetingToken}/chat?since=${encodeURIComponent(since)}`
      : `/api/meetings/${meetingToken}/chat`;
    const res = await fetch(url);
    if (!res.ok) return;

    const data = await res.json();
    const incoming = data.messages as MeetingChatMessage[];

    if (since && incoming.length > 0) {
      setMessages((prev) => {
        const byId = new Map(prev.map((m) => [m.id, m]));
        for (const msg of incoming) {
          byId.set(msg.id, msg);
        }
        return [...byId.values()].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
    } else if (!since) {
      setMessages(incoming);
    }

    const latest = incoming.at(-1);
    if (latest) {
      lastMessageAtRef.current = latest.createdAt;
    }

    if (typeof data.canModerate === "boolean") {
      setCanModerate(data.canModerate);
    }
  }, [meetingToken]);

  useVisibilityPolling(
    fetchMessages,
    isAdmin ? MEETING_POLL.chatHostMs : MEETING_POLL.chatMemberMs,
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const lastId = messages.at(-1)?.id ?? null;
    const hasNewMessages = lastId !== lastMessageIdRef.current;
    lastMessageIdRef.current = lastId;

    if (showScrollDown || !hasNewMessages) return;
    if (!stickToBottomRef.current) return;

    scrollContainerToBottom(node);
  }, [messages, showScrollDown]);

  function handleScroll() {
    const node = scrollRef.current;
    if (!node) return;
    const nearBottom = isNearBottom(node);
    stickToBottomRef.current = nearBottom;
    setShowScrollDown(!nearBottom);
  }

  function jumpToLatest() {
    const node = scrollRef.current;
    if (!node) return;
    stickToBottomRef.current = true;
    setShowScrollDown(false);
    scrollContainerToBottom(node);
  }

  function handleFilesSelected() {
    const files = fileRef.current?.files;
    setPendingFiles(files ? Array.from(files) : []);
    setUploadError("");
  }

  function clearPendingFiles() {
    setPendingFiles([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function uploadFile(file: File): Promise<Attachment | null> {
    const result = await uploadMeetingChatFile(meetingToken, file);
    if ("error" in result) {
      setUploadError(result.error);
      return null;
    }
    setUploadError("");
    const type = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
          ? "audio"
          : "file";
    return { type, url: result.url, name: file.name };
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;

    setSending(true);
    const attachments: Attachment[] = [];

    for (const file of pendingFiles) {
      const att = await uploadFile(file);
      if (att) attachments.push(att);
    }

    if (!content.trim() && attachments.length === 0) {
      setSending(false);
      return;
    }

    clearPendingFiles();

    const linkMatch = content.match(/https?:\/\/[^\s]+/);
    if (linkMatch && attachments.length === 0 && !content.trim()) {
      attachments.push({ type: "link", url: linkMatch[0] });
    }

    await fetch(`/api/meetings/${meetingToken}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.trim(),
        attachments: attachments.length ? attachments : undefined,
      }),
    });

    setContent("");
    setShowEmoji(false);
    setSending(false);
    stickToBottomRef.current = true;
    setShowScrollDown(false);
    fetchMessages();
  }

  function insertEmoji(emoji: string) {
    setContent((prev) => prev + emoji);
    setShowEmoji(false);
  }

  async function blockUser(targetUserId: string) {
    if (!canModerate) return;
    await fetch(`/api/meetings/${meetingToken}/chat`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetUserId, action: "block" }),
    });
    await fetch(`/api/meetings/${meetingToken}/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "kick", toUserId: targetUserId, payload: {} }),
    });
  }

  async function hideMessage(messageId: string) {
    await fetch(`/api/meetings/${meetingToken}/chat/${messageId}`, {
      method: "DELETE",
    });
    fetchMessages();
  }

  async function restoreMessage(messageId: string) {
    await fetch(`/api/meetings/${meetingToken}/chat/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    fetchMessages();
  }

  async function deleteOwnMessage(messageId: string) {
    const res = await fetch(`/api/meetings/${meetingToken}/chat/${messageId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    }
    fetchMessages();
  }

  async function saveEdit(messageId: string) {
    const res = await fetch(`/api/meetings/${meetingToken}/chat/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      setEditingId(null);
      setEditContent("");
      fetchMessages();
    }
  }

  return {
    messages,
    canModerate,
    content,
    setContent,
    pendingFiles,
    sending,
    uploadError,
    showEmoji,
    setShowEmoji,
    showScrollDown,
    editingId,
    setEditingId,
    editContent,
    setEditContent,
    now,
    scrollRef,
    fileRef,
    canSend,
    handleScroll,
    jumpToLatest,
    handleFilesSelected,
    clearPendingFiles,
    sendMessage,
    insertEmoji,
    blockUser,
    hideMessage,
    restoreMessage,
    deleteOwnMessage,
    saveEdit,
    isMessageEdited,
    getEditTimeRemaining,
    canEditMessage,
  };
}
