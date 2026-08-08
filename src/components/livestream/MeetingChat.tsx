"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, RotateCcw, Smile, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDate, type Attachment, cn } from "@/lib/utils";
import { isNearBottom, scrollContainerToBottom } from "@/lib/chat-scroll";
import { MessageAttachments } from "@/components/livestream/MessageAttachments";
import { EmojiPicker } from "@/components/livestream/EmojiPicker";

type MeetingMessage = {
  id: string;
  content: string;
  attachments: Attachment[] | null;
  createdAt: string;
  deletedAt: string | null;
  user: { id: string; name: string; avatarUrl: string | null };
};

export function MeetingChat({
  meetingToken,
  userId,
  isAdmin,
}: {
  meetingToken: string;
  userId: string;
  isAdmin: boolean;
}) {
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [canModerate, setCanModerate] = useState(isAdmin);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/meetings/${meetingToken}/chat`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
      if (typeof data.canModerate === "boolean") {
        setCanModerate(data.canModerate);
      }
    }
  }, [meetingToken]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2500);
    return () => clearInterval(interval);
  }, [fetchMessages]);

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

  async function uploadFile(file: File): Promise<Attachment | null> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) return null;
    const data = await res.json();
    const type = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
          ? "audio"
          : "file";
    return { type, url: data.url, name: file.name };
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const hasText = content.trim().length > 0;
    const hasFiles = (fileRef.current?.files?.length ?? 0) > 0;
    if (!hasText && !hasFiles) return;

    setSending(true);
    const attachments: Attachment[] = [];

    if (fileRef.current?.files?.length) {
      for (const file of Array.from(fileRef.current.files)) {
        const att = await uploadFile(file);
        if (att) attachments.push(att);
      }
      fileRef.current.value = "";
    }

    const linkMatch = content.match(/https?:\/\/[^\s]+/);
    if (linkMatch && attachments.length === 0 && !hasText) {
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-burgundy-dark">
      <div className="shrink-0 border-b border-gold/20 px-4 py-3">
        <h3 className="font-serif font-semibold text-cream">Meeting Chat</h3>
        <p className="text-xs text-gold-light/70">Messages, files & emojis — everyone in the room</p>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto p-4"
        >
        {messages.length === 0 && (
          <p className="text-center text-sm text-gold-light/60">
            Say hello! Share files 📎 or tap 😊 for emojis.
          </p>
        )}
        {messages.map((msg) => {
          const isHidden = Boolean(msg.deletedAt);
          return (
          <div
            key={msg.id}
            className="mb-3 flex gap-2"
          >
            <UserAvatar
              userId={msg.user.id}
              name={msg.user.name}
              avatarUrl={msg.user.avatarUrl}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-medium text-gold">{msg.user.name}</span>
                <span className="text-xs text-gold-light/50">{formatDate(msg.createdAt)}</span>
              </div>
              {msg.content && (
                <p className="whitespace-pre-wrap break-words text-sm text-cream/90">
                  {msg.content}
                </p>
              )}
              {msg.attachments && msg.attachments.length > 0 && (
                <MessageAttachments attachments={msg.attachments} />
              )}
              {canModerate && msg.user.id !== userId && (
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => blockUser(msg.user.id)}
                    className="text-xs text-gold-light/60 hover:text-gold"
                  >
                    Block
                  </button>
                  {isHidden ? (
                    <button
                      type="button"
                      onClick={() => restoreMessage(msg.id)}
                      className="inline-flex items-center gap-1 text-xs text-gold-light/60 hover:text-gold"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => hideMessage(msg.id)}
                      className="inline-flex items-center gap-1 text-xs text-gold-light/60 hover:text-gold"
                    >
                      <Trash2 className="h-3 w-3" />
                      Hide
                    </button>
                  )}
                </div>
              )}
              {canModerate && msg.user.id === userId && !isHidden && (
                <button
                  type="button"
                  onClick={() => hideMessage(msg.id)}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-gold-light/60 hover:text-gold"
                >
                  <Trash2 className="h-3 w-3" />
                  Hide
                </button>
              )}
              {canModerate && msg.user.id === userId && isHidden && (
                <button
                  type="button"
                  onClick={() => restoreMessage(msg.id)}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-gold-light/60 hover:text-gold"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore
                </button>
              )}
            </div>
          </div>
        );
        })}
        </div>

        {showScrollDown && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3 right-3 rounded-full border border-gold/40 bg-burgundy px-3 py-1.5 text-xs font-semibold text-gold-light shadow-lg hover:bg-burgundy-deep"
          >
            ↓ New messages
          </button>
        )}
      </div>
      <form onSubmit={sendMessage} className="relative shrink-0 border-t border-gold/20 bg-burgundy-dark p-3">
        {showEmoji && (
          <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
        )}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
          className="hidden"
          id={`meeting-file-${meetingToken}`}
        />
        <div className="flex gap-2">
          <label
            htmlFor={`meeting-file-${meetingToken}`}
            className="flex cursor-pointer items-center rounded-lg border border-gold/30 bg-burgundy px-3 py-2 text-gold-light hover:bg-burgundy-deep"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </label>
          <button
            type="button"
            onClick={() => setShowEmoji((s) => !s)}
            className="rounded-lg border border-gold/30 bg-burgundy px-3 py-2 text-gold-light hover:bg-burgundy-deep"
            title="Add emoji"
          >
            <Smile className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Message, emoji, or attach a file..."
            className="flex-1 rounded-lg border border-gold/30 bg-burgundy px-3 py-2 text-sm text-cream placeholder:text-gold-light/40 focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-burgundy-deep disabled:opacity-60"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
