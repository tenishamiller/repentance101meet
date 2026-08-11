"use client";

import { Paperclip, Pencil, RotateCcw, Smile, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDate } from "@/lib/utils";
import { MEETING_CHAT_MAX_FILE_LABEL } from "@/lib/chat-attachments";
import { useMeetingChat } from "@/hooks/useMeetingChat";
import { MessageAttachments } from "@/components/livestream/MessageAttachments";
import { EmojiPicker } from "@/components/livestream/EmojiPicker";

type Props = {
  meetingToken: string;
  userId: string;
  isAdmin: boolean;
};

/**
 * Desktop-only livestream chat. Simple flex column: header, scrollable messages, pinned composer.
 * Intentionally separate from mobile MeetingChat to avoid shared layout bugs.
 */
export function DesktopMeetingChat({ meetingToken, userId, isAdmin }: Props) {
  const chat = useMeetingChat({ meetingToken, userId, isAdmin });

  return (
    <section
      aria-label="Meeting Chat"
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-burgundy-dark"
    >
      <header className="shrink-0 border-b border-gold/20 px-4 py-3">
        <h3 className="font-serif font-semibold text-cream">Meeting Chat</h3>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={chat.scrollRef}
          onScroll={chat.handleScroll}
          className="livestream-panel-scroll chat-scroll chat-scroll-dark h-full overflow-y-auto overscroll-y-contain p-4"
        >
          {chat.messages.length === 0 && (
            <p className="text-center text-sm text-gold-light/60">
              Say hello! Share files or add emojis.
            </p>
          )}
          {chat.messages.map((msg) => {
            const isHidden = Boolean(msg.deletedAt);
            const isOwn = msg.user.id === userId;
            const isEditing = chat.editingId === msg.id;
            const canModify = isOwn && chat.canEditMessage(msg.createdAt, chat.now);
            const edited = chat.isMessageEdited(msg.editedAt);
            const editRemaining = canModify
              ? chat.getEditTimeRemaining(msg.createdAt, chat.now)
              : null;

            return (
              <article key={msg.id} className="mb-3 flex gap-2">
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
                        value={chat.editContent}
                        onChange={(e) => chat.setEditContent(e.target.value)}
                        className="w-full rounded-lg border border-gold/30 bg-burgundy px-3 py-2 text-sm text-cream focus:outline-none focus:ring-2 focus:ring-gold/40"
                        rows={3}
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void chat.saveEdit(msg.id)}
                          className="rounded-lg bg-gold px-3 py-1.5 text-sm font-bold text-burgundy-deep"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            chat.setEditingId(null);
                            chat.setEditContent("");
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
                          chat.setEditingId(msg.id);
                          chat.setEditContent(msg.content);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-gold-light/60 hover:text-gold"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void chat.deleteOwnMessage(msg.id)}
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

                  {chat.canModerate && !isOwn && (
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void chat.blockUser(msg.user.id)}
                        className="text-xs text-gold-light/60 hover:text-gold"
                      >
                        Block
                      </button>
                      {isHidden ? (
                        <button
                          type="button"
                          onClick={() => void chat.restoreMessage(msg.id)}
                          className="inline-flex items-center gap-1 text-xs text-gold-light/60 hover:text-gold"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void chat.hideMessage(msg.id)}
                          className="inline-flex items-center gap-1 text-xs text-gold-light/60 hover:text-gold"
                        >
                          <Trash2 className="h-3 w-3" />
                          Hide
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {chat.showScrollDown && (
          <button
            type="button"
            onClick={chat.jumpToLatest}
            className="absolute bottom-3 right-3 z-10 rounded-full border border-gold/40 bg-burgundy px-3 py-1.5 text-xs font-semibold text-gold-light shadow-lg hover:bg-burgundy-deep"
          >
            ↓ New messages
          </button>
        )}
      </div>

      <footer className="shrink-0 border-t border-gold/20 bg-burgundy-dark p-3">
        <form onSubmit={chat.sendMessage}>
          {chat.uploadError && (
            <p className="mb-2 text-xs text-red-300">{chat.uploadError}</p>
          )}
          {chat.pendingFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {chat.pendingFiles.map((file) => (
                <span
                  key={`${file.name}-${file.size}`}
                  className="rounded-full border border-gold/30 bg-burgundy px-2.5 py-1 text-xs text-gold-light"
                >
                  📎 {file.name}
                </span>
              ))}
              <button
                type="button"
                onClick={chat.clearPendingFiles}
                className="text-xs text-gold-light/60 hover:text-gold"
              >
                Clear
              </button>
            </div>
          )}
          {chat.showEmoji && (
            <EmojiPicker onSelect={chat.insertEmoji} onClose={() => chat.setShowEmoji(false)} />
          )}
          <input
            ref={chat.fileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
            className="hidden"
            id={`desktop-meeting-file-${meetingToken}`}
            onChange={chat.handleFilesSelected}
          />
          <div className="flex min-w-0 items-stretch gap-2">
            <label
              htmlFor={`desktop-meeting-file-${meetingToken}`}
              className="flex shrink-0 cursor-pointer items-center rounded-lg border border-gold/30 bg-burgundy px-3 py-2 text-gold-light hover:bg-burgundy-deep"
              title={`Attach file (max ${MEETING_CHAT_MAX_FILE_LABEL})`}
            >
              <Paperclip className="h-4 w-4" />
            </label>
            <button
              type="button"
              onClick={() => chat.setShowEmoji((s) => !s)}
              className="shrink-0 rounded-lg border border-gold/30 bg-burgundy px-3 py-2 text-gold-light hover:bg-burgundy-deep"
              title="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={chat.content}
              onChange={(e) => chat.setContent(e.target.value)}
              placeholder="Message..."
              className="min-w-0 flex-1 rounded-lg border border-gold/30 bg-burgundy px-3 py-2 text-sm text-cream placeholder:text-gold-light/40 focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
            <button
              type="submit"
              disabled={chat.sending || !chat.canSend}
              className="shrink-0 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-burgundy-deep disabled:opacity-60"
            >
              {chat.sending ? "..." : "Send"}
            </button>
          </div>
        </form>
      </footer>
    </section>
  );
}
