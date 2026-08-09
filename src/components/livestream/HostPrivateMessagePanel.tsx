"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SendHorizontal, X } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { scrollContainerToBottom } from "@/lib/chat-scroll";
import { formatRequestDateTime } from "@/lib/utils";
import type { MembershipMessageData } from "@/components/messages/MembershipMessageBubble";

type Member = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type Props = {
  member: Member;
  hostId: string;
  onClose: () => void;
};

export function HostPrivateMessagePanel({ member, hostId, onClose }: Props) {
  const [messages, setMessages] = useState<MembershipMessageData[]>([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/messages?userId=${encodeURIComponent(member.id)}`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages((data.messages ?? []) as MembershipMessageData[]);
  }, [member.id]);

  useEffect(() => {
    void fetchMessages();
    const interval = setInterval(() => void fetchMessages(), 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) scrollContainerToBottom(node);
  }, [messages]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim(), threadUserId: member.id }),
    });
    setContent("");
    setSending(false);
    void fetchMessages();
  }

  return (
    <div className="flex max-h-[min(42vh,20rem)] min-h-0 shrink-0 flex-col border-b border-gold/30 bg-burgundy">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gold/20 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <UserAvatar
            userId={member.id}
            name={member.name}
            avatarUrl={member.avatarUrl}
            size="md"
          />
          <div className="min-w-0">
            <p className="truncate font-serif text-sm font-semibold text-cream">
              Private message to {member.name}
            </p>
            <p className="text-[11px] text-gold-light/65">Only they can see this — not the room chat</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-gold-light/60 hover:bg-burgundy-dark hover:text-gold"
          aria-label="Close private message"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="chat-scroll chat-scroll-dark min-h-0 flex-1 px-3 py-3">
        {messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-gold-light/55">
            Send a private note to {member.name.split(" ")[0]} while you&apos;re live.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {messages.slice(-20).map((msg) => {
              const isHost = msg.sender.id === hostId;
              return (
                <li
                  key={msg.id}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    isHost
                      ? "ml-4 border-gold/30 bg-gold/15 text-cream"
                      : "mr-4 border-gold/15 bg-burgundy-dark text-gold-light/90"
                  }`}
                >
                  <p className="text-[10px] font-semibold text-gold-light/55">
                    {isHost ? "You" : msg.sender.name}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className="mt-1 text-[10px] text-gold-light/40">
                    {formatRequestDateTime(msg.createdAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={(event) => void sendMessage(event)}
        className="flex shrink-0 gap-2 border-t border-gold/20 p-3"
      >
        <input
          type="text"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={`Message ${member.name.split(" ")[0]} privately...`}
          className="flex-1 rounded-lg border border-gold/30 bg-burgundy-dark px-3 py-2 text-sm text-cream placeholder:text-gold-light/40 focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="rounded-lg bg-gold px-3 py-2 text-burgundy-deep disabled:opacity-50"
          aria-label="Send private message"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
