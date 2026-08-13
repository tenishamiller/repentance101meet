"use client";

import { CornerDownRight, Paperclip, Pencil, RotateCcw, Smile, Trash2, X } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDate } from "@/lib/utils";
import { MEETING_CHAT_MAX_FILE_LABEL } from "@/lib/chat-attachments";
import { meetingChatReplyPreview } from "@/lib/meeting-chat-reply";
import { useMeetingChat } from "@/hooks/useMeetingChat";
import { MessageAttachments } from "@/components/livestream/MessageAttachments";
import { EmojiPicker } from "@/components/livestream/EmojiPicker";

export function MeetingChat({
  meetingToken,
  userId,
  isAdmin,
}: {
  meetingToken: string;
  userId: string;
  isAdmin: boolean;
}) {
  const chat = useMeetingChat({ meetingToken, userId, isAdmin });

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-burgundy-dark">
      <div className="shrink-0 border-b border-gold/20 px-3 py-2">
        <h3 className="font-serif text-sm font-semibold text-cream lg:text-base">
          Meeting Chat
        </h3>
      </div>

      <div
        ref={chat.scrollRef}
        onScroll={chat.handleScroll}
        className="livestream-panel-scroll chat-scroll chat-scroll-dark min-h-0 overflow-y-auto overscroll-y-contain p-3"
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
            <div key={msg.id} className="mb-2 flex gap-2">
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
                    {msg.replyTo && (
                      <div className="mb-2 rounded-lg border-l-2 border-gold/50 bg-burgundy/40 px-2.5 py-1.5">
                        <p className="text-[11px] font-semibold text-gold">
                          {msg.replyTo.deletedAt
                            ? "Original message removed"
                            : msg.replyTo.user.name}
                        </p>
                        {!msg.replyTo.deletedAt && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-gold-light/70">
                            {meetingChatReplyPreview(msg.replyTo.content)}
                          </p>
                        )}
                      </div>
                    )}
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

                {!isEditing && (
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => chat.startReply(msg)}
                      className="inline-flex items-center gap-1 text-xs text-gold-light/60 hover:text-gold"
                    >
                      <CornerDownRight className="h-3 w-3" />
                      Reply
                    </button>
                  </div>
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
            </div>
          );
        })}

        {chat.showScrollDown && (
          <div className="sticky bottom-0 flex justify-end pb-1 pt-2">
            <button
              type="button"
              onClick={chat.jumpToLatest}
              className="rounded-full border border-gold/40 bg-burgundy px-3 py-1.5 text-xs font-semibold text-gold-light shadow-lg hover:bg-burgundy-deep"
            >
              ↓ New messages
            </button>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => void chat.sendMessage(e)}
        className="relative shrink-0 border-t border-gold/20 bg-burgundy-dark p-2 sm:p-3"
      >
        {chat.replyTo && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-gold/30 bg-burgundy px-2.5 py-2">
            <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gold">
                Replying to {chat.replyTo.user.name}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-gold-light/70">
                {meetingChatReplyPreview(chat.replyTo.content)}
              </p>
            </div>
            <button
              type="button"
              onClick={chat.cancelReply}
              className="shrink-0 rounded p-1 text-gold-light/60 hover:bg-burgundy-deep hover:text-gold-light"
              aria-label="Cancel reply"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
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
          id={`meeting-file-${meetingToken}`}
          onChange={chat.handleFilesSelected}
        />
        <div className="flex min-w-0 items-stretch gap-1.5 sm:gap-2">
          <label
            htmlFor={`meeting-file-${meetingToken}`}
            className="flex shrink-0 cursor-pointer items-center rounded-md border border-gold/30 bg-burgundy px-2 py-1.5 text-gold-light hover:bg-burgundy-deep sm:px-2.5"
            title={`Attach file (max ${MEETING_CHAT_MAX_FILE_LABEL})`}
          >
            <Paperclip className="h-4 w-4" />
          </label>
          <button
            type="button"
            onClick={() => chat.setShowEmoji((s) => !s)}
            className="shrink-0 rounded-md border border-gold/30 bg-burgundy px-2 py-1.5 text-gold-light hover:bg-burgundy-deep sm:px-2.5"
            title="Add emoji"
          >
            <Smile className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={chat.content}
            onChange={(e) => chat.setContent(e.target.value)}
            placeholder={chat.replyTo ? "Write a reply..." : "Message..."}
            className="min-w-0 flex-1 rounded-md border border-gold/30 bg-burgundy px-2 py-1.5 text-sm text-cream placeholder:text-gold-light/40 focus:outline-none focus:ring-2 focus:ring-gold/40 sm:px-3"
          />
          <button
            type="submit"
            disabled={chat.sending || !chat.canSend}
            className="shrink-0 rounded-md bg-gold px-3 py-1.5 text-sm font-bold text-burgundy-deep disabled:opacity-60 sm:px-4"
          >
            {chat.sending ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
