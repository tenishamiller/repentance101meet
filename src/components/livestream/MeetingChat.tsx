"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, Pencil, RotateCcw, Smile, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDate, canEditMessage, type Attachment } from "@/lib/utils";
import { MEETING_CHAT_MAX_FILE_LABEL } from "@/lib/chat-attachments";
import { uploadMeetingChatFile } from "@/lib/meeting-chat-upload";
import { getEditTimeRemaining, isMessageEdited } from "@/lib/channel-messages";
import { isNearBottom, scrollContainerToBottom } from "@/lib/chat-scroll";
import { MEETING_POLL } from "@/lib/meeting-poll-intervals";
import { useVisibilityPolling } from "@/hooks/useVisibilityPolling";
import { MessageAttachments } from "@/components/livestream/MessageAttachments";
import { EmojiPicker } from "@/components/livestream/EmojiPicker";
import { cn } from "@/lib/utils";

type MeetingMessage = {
  id: string;
  content: string;
  attachments: Attachment[] | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  user: { id: string; name: string; avatarUrl: string | null };
};

export function MeetingChat({
  meetingToken,
  userId,
  isAdmin,
  wideMessageBox = false,
}: {
  meetingToken: string;
  userId: string;
  isAdmin: boolean;
  /** Desktop livestream members: extend the composer left over the video while keeping height. */
  wideMessageBox?: boolean;
}) {
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
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
  const stickToBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);
  const lastMessageAtRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSend = content.trim().length > 0 || pendingFiles.length > 0;

  const fetchMessages = useCallback(async () => {
    const since = lastMessageAtRef.current;
    const url = since
      ? `/api/meetings/${meetingToken}/chat?since=${encodeURIComponent(since)}`
      : `/api/meetings/${meetingToken}/chat`;
    const res = await fetch(url);
    if (!res.ok) return;

    const data = await res.json();
    const incoming = data.messages as MeetingMessage[];

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

  return (
    <div className="grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)_auto] bg-burgundy-dark">
      <div className="border-b border-gold/20 px-4 py-3">
        <h3 className="font-serif font-semibold text-cream">Meeting Chat</h3>
      </div>
      <div className="relative min-h-0 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="chat-scroll chat-scroll-dark absolute inset-0 overflow-y-auto p-4"
        >
        {messages.length === 0 && (
          <p className="text-center text-sm text-gold-light/60">
            Say hello! Share files 📎 or tap 😊 for emojis.
          </p>
        )}
        {messages.map((msg) => {
          const isHidden = Boolean(msg.deletedAt);
          const isOwn = msg.user.id === userId;
          const isEditing = editingId === msg.id;
          const canModify = isOwn && canEditMessage(msg.createdAt, now);
          const edited = isMessageEdited(msg.editedAt);
          const editRemaining = canModify ? getEditTimeRemaining(msg.createdAt, now) : null;

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
                {edited && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-gold-light/45">
                    Edited
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="mt-1">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full rounded-lg border border-gold/30 bg-burgundy px-3 py-2 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold/40"
                    rows={3}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(msg.id)}
                      className="rounded-lg bg-gold px-3 py-1.5 text-sm font-bold text-burgundy-deep"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditContent("");
                      }}
                      className="rounded-lg border border-gold/30 px-3 py-1.5 text-sm text-gold-light"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {msg.content && (
                    <p className="whitespace-pre-wrap break-words text-sm text-cream/90">
                      {msg.content}
                    </p>
                  )}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <MessageAttachments attachments={msg.attachments} />
                  )}
                </>
              )}

              {canModify && !isEditing && (
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(msg.id);
                      setEditContent(msg.content);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-gold-light/60 hover:text-gold"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteOwnMessage(msg.id)}
                    className="inline-flex items-center gap-1 text-xs text-gold-light/60 hover:text-gold"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                  {editRemaining && (
                    <span className="text-[10px] text-gold-light/40">{editRemaining}</span>
                  )}
                </div>
              )}

              {canModerate && !isOwn && (
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
      <form
        onSubmit={sendMessage}
        className={cn(
          "relative z-20 shrink-0 border-t border-gold/20 bg-burgundy-dark p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-3",
          wideMessageBox &&
            "lg:-ml-[9rem] lg:w-[calc(100%+9rem)] lg:max-w-[38rem] lg:border-x lg:border-gold/20 lg:shadow-[0_-4px_24px_rgba(0,0,0,0.35)]",
        )}
      >
        {uploadError && (
          <p className="mb-2 text-xs text-red-300">{uploadError}</p>
        )}
        {pendingFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {pendingFiles.map((file) => (
              <span
                key={`${file.name}-${file.size}`}
                className="rounded-full border border-gold/30 bg-burgundy px-2.5 py-1 text-xs text-gold-light"
              >
                📎 {file.name}
              </span>
            ))}
            <button
              type="button"
              onClick={clearPendingFiles}
              className="text-xs text-gold-light/60 hover:text-gold"
            >
              Clear
            </button>
          </div>
        )}
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
          onChange={handleFilesSelected}
        />
        <div className="flex min-w-0 items-stretch gap-1.5 sm:gap-2">
          <label
            htmlFor={`meeting-file-${meetingToken}`}
            className="flex shrink-0 cursor-pointer items-center rounded-lg border border-gold/30 bg-burgundy px-2.5 py-2 text-gold-light hover:bg-burgundy-deep sm:px-3"
            title={`Attach file (max ${MEETING_CHAT_MAX_FILE_LABEL})`}
          >
            <Paperclip className="h-4 w-4" />
          </label>
          <button
            type="button"
            onClick={() => setShowEmoji((s) => !s)}
            className="shrink-0 rounded-lg border border-gold/30 bg-burgundy px-2.5 py-2 text-gold-light hover:bg-burgundy-deep sm:px-3"
            title="Add emoji"
          >
            <Smile className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Message..."
            className="min-w-0 flex-1 rounded-lg border border-gold/30 bg-burgundy px-2.5 py-2 text-sm text-cream placeholder:text-gold-light/40 focus:outline-none focus:ring-2 focus:ring-gold/40 sm:px-3"
          />
          <button
            type="submit"
            disabled={sending || !canSend}
            className="shrink-0 rounded-lg bg-gold px-3 py-2 text-sm font-bold text-burgundy-deep disabled:opacity-60 sm:px-4"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
