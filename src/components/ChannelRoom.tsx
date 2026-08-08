"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import type { Channel } from "@/generated/prisma/client";
import { ChannelComposer } from "@/components/channels/ChannelComposer";
import {
  ChannelMessageItem,
  type ChannelMessageData,
} from "@/components/channels/ChannelMessageItem";
import { BrandDivider } from "@/components/BrandDivider";
import { formatDateSeparator, shouldShowDateSeparator } from "@/lib/channel-messages";
import { isNearBottom, scrollContainerToBottom } from "@/lib/chat-scroll";
import { type Attachment } from "@/lib/utils";

type Props = {
  channel: Channel;
  userId: string;
  isAdmin: boolean;
};

export function ChannelRoom({ channel, userId, isAdmin }: Props) {
  const [messages, setMessages] = useState<ChannelMessageData[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/channels/${channel.slug}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
    setLoading(false);
  }, [channel.slug]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || loading) return;

    const lastId = messages.at(-1)?.id ?? null;
    const hasNewMessages = lastId !== lastMessageIdRef.current;
    lastMessageIdRef.current = lastId;

    if (showScrollDown || !hasNewMessages) return;
    if (!stickToBottomRef.current) return;

    scrollContainerToBottom(node);
  }, [loading, messages, showScrollDown]);

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

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim() && !fileRef.current?.files?.length) return;

    setSending(true);
    const attachments: Attachment[] = [];

    if (fileRef.current?.files?.length) {
      for (const file of Array.from(fileRef.current.files)) {
        const attachment = await uploadFile(file);
        if (attachment) attachments.push(attachment);
      }
      fileRef.current.value = "";
    }

    const linkMatch = content.match(/https?:\/\/[^\s]+/);
    if (linkMatch && attachments.length === 0) {
      attachments.push({ type: "link", url: linkMatch[0] });
    }

    await fetch(`/api/channels/${channel.slug}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim(), attachments }),
    });

    setContent("");
    setSending(false);
    stickToBottomRef.current = true;
    setShowScrollDown(false);
    fetchMessages();
  }

  async function handleEdit(messageId: string) {
    await fetch(`/api/channels/${channel.slug}/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    setEditingId(null);
    fetchMessages();
  }

  async function handleDelete(messageId: string) {
    await fetch(`/api/channels/${channel.slug}/messages/${messageId}`, {
      method: "DELETE",
    });
    fetchMessages();
  }

  async function handleToggleReaction(messageId: string, emoji: string) {
    await fetch(`/api/channels/${channel.slug}/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction: emoji }),
    });
    fetchMessages();
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-5xl flex-col px-4 py-6">
      <div className="mb-4 rounded-2xl border border-gold/30 bg-gradient-to-r from-burgundy/5 via-cream to-gold/10 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-muted">
              Ministry Channel
            </p>
            <h1 className="font-serif text-3xl font-bold text-burgundy">{channel.name}</h1>
            <BrandDivider className="my-2 max-w-xs" />
            <p className="max-w-2xl text-sm text-burgundy/70">{channel.description}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-gold/30 bg-cream/80 px-4 py-2 text-sm text-burgundy">
            <MessageCircle className="h-4 w-4 text-gold-muted" />
            <span>{messages.length} messages</span>
          </div>
        </div>
      </div>

      <div className="relative flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="channel-feed card-brand h-full overflow-y-auto p-4 shadow-inner sm:p-6"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <p className="animate-pulse text-burgundy/60">Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 rounded-full bg-gold/15 p-5 text-4xl">🙏</div>
              <p className="font-serif text-xl font-semibold text-burgundy">Start the conversation</p>
              <p className="mt-2 max-w-sm text-sm text-burgundy/60">
                Share encouragement, scripture, prayer requests, or attach photos and files.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((message, index) => {
                const previous = index > 0 ? messages[index - 1] : null;
                const showSeparator = shouldShowDateSeparator(
                  message.createdAt,
                  previous?.createdAt ?? null,
                );

                return (
                  <div key={message.id}>
                    {showSeparator && (
                      <div className="my-6 flex items-center gap-3">
                        <div className="h-px flex-1 bg-gold/25" />
                        <span className="rounded-full border border-gold/25 bg-cream px-3 py-1 text-xs font-medium text-burgundy/55">
                          {formatDateSeparator(message.createdAt)}
                        </span>
                        <div className="h-px flex-1 bg-gold/25" />
                      </div>
                    )}

                    <ChannelMessageItem
                      message={message}
                      isOwn={message.user.id === userId}
                      isAdmin={isAdmin}
                      userId={userId}
                      editingId={editingId}
                      editContent={editContent}
                      onEditContentChange={setEditContent}
                      onStartEdit={() => {
                        setEditingId(message.id);
                        setEditContent(message.content);
                      }}
                      onCancelEdit={() => setEditingId(null)}
                      onSaveEdit={() => handleEdit(message.id)}
                      onDelete={() => handleDelete(message.id)}
                      onToggleReaction={(emoji) => handleToggleReaction(message.id, emoji)}
                      now={now}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showScrollDown && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full border border-gold/40 bg-cream px-4 py-2 text-sm font-medium text-burgundy shadow-lg transition hover:border-gold hover:bg-gold/10"
          >
            <ChevronDown className="h-4 w-4" />
            New messages
          </button>
        )}
      </div>

      <ChannelComposer
        content={content}
        sending={sending}
        onContentChange={setContent}
        onSubmit={handleSend}
        fileRef={fileRef}
      />
    </div>
  );
}
