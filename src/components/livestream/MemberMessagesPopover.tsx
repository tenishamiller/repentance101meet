"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, SendHorizontal, X } from "lucide-react";
import { scrollContainerToBottom } from "@/lib/chat-scroll";
import { formatRequestDateTime } from "@/lib/utils";
import type { MembershipMessageData } from "@/components/messages/MembershipMessageBubble";

type Props = {
  userId: string;
};

export function MemberMessagesPopover({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<MembershipMessageData[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeenAdminMessageRef = useRef<string | null>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch("/api/messages");
    if (!res.ok) return;
    const data = await res.json();
    const list = (data.messages ?? []) as MembershipMessageData[];
    setMessages(list);

    const lastAdmin = [...list].reverse().find((m) => m.sender.role === "ADMIN");
    if (lastAdmin) {
      const seen = lastSeenAdminMessageRef.current;
      setHasUnread(!open && seen !== lastAdmin.id);
    }
  }, [open]);

  useEffect(() => {
    void fetchMessages();
    const interval = setInterval(() => void fetchMessages(), 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (node) scrollContainerToBottom(node);

    const lastAdmin = [...messages].reverse().find((m) => m.sender.role === "ADMIN");
    if (lastAdmin) {
      lastSeenAdminMessageRef.current = lastAdmin.id;
      setHasUnread(false);
    }
  }, [messages, open]);

  function handleOpen() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
  }

  function scheduleClose() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), 280);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim(), threadUserId: userId }),
    });
    setContent("");
    setSending(false);
    void fetchMessages();
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleOpen}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex items-center gap-2 rounded-full border border-gold/40 bg-burgundy px-4 py-2.5 text-sm font-semibold text-gold-light transition hover:bg-burgundy-dark"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Messages</span>
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-burgundy-dark" />
        )}
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 z-50 mb-2 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-gold/30 bg-cream shadow-2xl sm:w-80"
          onMouseEnter={handleOpen}
          onMouseLeave={scheduleClose}
        >
          <div className="flex items-center justify-between border-b border-gold/20 px-4 py-3">
            <div>
              <p className="font-serif text-sm font-bold text-burgundy">Messages from Norman</p>
              <p className="text-xs text-burgundy/55">Reply without leaving the livestream</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-burgundy/50 hover:bg-burgundy/5 hover:text-burgundy"
              aria-label="Close messages"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="max-h-64 min-h-[8rem] overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <p className="py-6 text-center text-sm text-burgundy/50">
                No messages yet. Norman may reach out here about membership or ministry.
              </p>
            ) : (
              <ul className="space-y-3">
                {messages.slice(-12).map((msg) => {
                  const isOwn = msg.sender.id === userId;
                  return (
                    <li
                      key={msg.id}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        isOwn
                          ? "ml-6 border-gold/20 bg-gold/10 text-burgundy"
                          : "mr-6 border-gold/25 bg-white text-burgundy/90"
                      }`}
                    >
                      <p className="text-[11px] font-semibold text-burgundy/55">
                        {isOwn ? "You" : msg.sender.name}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className="mt-1 text-[10px] text-burgundy/40">
                        {formatRequestDateTime(msg.createdAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <form
            onSubmit={(e) => void sendMessage(e)}
            className="flex gap-2 border-t border-gold/20 bg-cream-dark p-3"
          >
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a reply..."
              className="flex-1 rounded-lg border border-gold/30 bg-white px-3 py-2 text-sm text-burgundy placeholder:text-burgundy/40 focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
            <button
              type="submit"
              disabled={sending || !content.trim()}
              className="rounded-lg bg-burgundy px-3 py-2 text-cream disabled:opacity-50"
              aria-label="Send message"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
