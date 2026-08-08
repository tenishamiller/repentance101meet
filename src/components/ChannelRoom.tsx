"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Channel } from "@/generated/prisma/client";
import { UserAvatar } from "@/components/UserAvatar";
import { canEditMessage, type Attachment } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { BrandDivider } from "@/components/BrandDivider";

type Message = {
  id: string;
  content: string;
  attachments: Attachment[] | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user: { id: string; name: string; avatarUrl: string | null };
};

type Props = {
  channel: Channel;
  userId: string;
  isAdmin: boolean;
};

export function ChannelRoom({ channel, userId, isAdmin }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !fileRef.current?.files?.length) return;

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

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-4xl flex-col px-4 py-6">
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-bold text-burgundy">{channel.name}</h1>
        <BrandDivider className="my-2 max-w-xs" />
        <p className="text-sm text-burgundy/70">{channel.description}</p>
      </div>

      <div className="card-brand flex-1 overflow-y-auto p-4 shadow-inner">
        {loading ? (
          <p className="text-center text-burgundy/60">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-burgundy/60">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="mb-4 flex gap-3">
              <UserAvatar
                userId={msg.user.id}
                name={msg.user.name}
                avatarUrl={msg.user.avatarUrl}
                size="md"
              />
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-burgundy">{msg.user.name}</span>
                  <span className="text-xs text-burgundy/50">{formatDate(msg.createdAt)}</span>
                </div>

                {msg.deletedAt ? (
                  <p className="text-sm italic text-burgundy/50">Message deleted</p>
                ) : editingId === msg.id ? (
                  <div className="mt-1">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="input-field text-sm"
                      rows={2}
                    />
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(msg.id)}
                        className="text-sm text-gold-muted hover:underline"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-sm text-burgundy/50 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.content && (
                      <p className="mt-1 whitespace-pre-wrap text-burgundy/90">{msg.content}</p>
                    )}
                    {msg.attachments?.map((att, i) => (
                      <div key={i} className="mt-2">
                        {att.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={att.url} alt={att.name ?? "attachment"} className="max-h-48 rounded-lg border border-gold/30" />
                        ) : att.type === "video" ? (
                          <video src={att.url} controls className="max-h-48 rounded-lg" />
                        ) : att.type === "audio" ? (
                          <audio src={att.url} controls />
                        ) : (
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gold-muted hover:underline"
                          >
                            {att.name ?? att.url}
                          </a>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {!msg.deletedAt &&
                  (msg.user.id === userId || isAdmin) &&
                  canEditMessage(msg.createdAt) &&
                  editingId !== msg.id && (
                    <div className="mt-1 flex gap-3 text-xs">
                      {msg.user.id === userId && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(msg.id);
                              setEditContent(msg.content);
                            }}
                            className="text-burgundy/50 hover:text-gold-muted"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                            className="text-burgundy/50 hover:text-burgundy"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="flex cursor-pointer items-center rounded-lg border border-gold/40 bg-cream px-3 py-2 text-sm text-burgundy hover:bg-cream-dark"
        >
          📎
        </label>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message, paste a link..."
          className="input-field flex-1"
        />
        <button type="submit" disabled={sending} className="btn-primary !px-5 disabled:opacity-60">
          Send
        </button>
      </form>
    </div>
  );
}
