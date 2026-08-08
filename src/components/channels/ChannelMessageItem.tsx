"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { QuickEmojiBar } from "@/components/channels/EmojiPicker";
import {
  formatMessageTime,
  getEditTimeRemaining,
  isMessageEdited,
  parseMessageContent,
  type MessageReactions,
} from "@/lib/channel-messages";
import { canEditMessage, cn, type Attachment } from "@/lib/utils";

export type ChannelMessageData = {
  id: string;
  content: string;
  attachments: Attachment[] | null;
  reactions: MessageReactions | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user: { id: string; name: string; avatarUrl: string | null };
};

type Props = {
  message: ChannelMessageData;
  isOwn: boolean;
  isAdmin: boolean;
  userId: string;
  editingId: string | null;
  editContent: string;
  onEditContentChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onToggleReaction: (emoji: string) => void;
  now: number;
};

export function ChannelMessageItem({
  message,
  isOwn,
  isAdmin,
  userId,
  editingId,
  editContent,
  onEditContentChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onToggleReaction,
  now,
}: Props) {
  const [showActions, setShowActions] = useState(false);
  const [showReactBar, setShowReactBar] = useState(false);
  const canEdit = canEditMessage(message.createdAt);
  const isEditing = editingId === message.id;
  const edited = isMessageEdited(message.createdAt, message.updatedAt);
  const editRemaining = isOwn && canEdit ? getEditTimeRemaining(message.createdAt, now) : null;
  const reactionEntries = Object.entries(message.reactions ?? {});

  return (
    <div
      className={cn("group flex gap-3", isOwn && "flex-row-reverse")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactBar(false);
      }}
    >
      <UserAvatar
        userId={message.user.id}
        name={message.user.name}
        avatarUrl={message.user.avatarUrl}
        size="md"
        className="mt-1 ring-2 ring-gold/50"
      />

      <div className={cn("flex max-w-[min(100%,42rem)] flex-col", isOwn && "items-end")}>
        <div
          className={cn(
            "relative rounded-2xl px-4 py-3 shadow-sm transition",
            isOwn
              ? "rounded-tr-md bg-gradient-to-br from-gold/25 via-gold-light/40 to-cream border border-gold/35"
              : "rounded-tl-md border border-gold/20 bg-white/80",
          )}
        >
          <div className={cn("mb-1 flex flex-wrap items-center gap-2", isOwn && "justify-end")}>
            <span className="font-semibold text-burgundy">{message.user.name}</span>
            <span className="text-xs text-burgundy/45">{formatMessageTime(message.createdAt)}</span>
            {edited && (
              <span className="rounded-full bg-burgundy/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-burgundy/50">
                Edited
              </span>
            )}
          </div>

          {isEditing ? (
            <div>
              <textarea
                value={editContent}
                onChange={(event) => onEditContentChange(event.target.value)}
                className="input-field text-sm"
                rows={3}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onSaveEdit}
                  className="rounded-lg bg-burgundy px-3 py-1.5 text-sm font-medium text-cream hover:bg-burgundy-dark"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="rounded-lg px-3 py-1.5 text-sm text-burgundy/60 hover:bg-burgundy/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {message.content && (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-burgundy/90">
                  {parseMessageContent(message.content).map((part, index) =>
                    part.type === "link" ? (
                      <a
                        key={`${message.id}-link-${index}`}
                        href={part.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gold-muted underline decoration-gold/40 underline-offset-2 hover:text-burgundy"
                      >
                        {part.value}
                      </a>
                    ) : (
                      <span key={`${message.id}-text-${index}`}>{part.value}</span>
                    ),
                  )}
                </p>
              )}

              {message.attachments?.map((attachment, index) => (
                <div key={`${message.id}-att-${index}`} className="mt-3">
                  {attachment.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachment.url}
                      alt={attachment.name ?? "Shared image"}
                      className="max-h-64 rounded-xl border border-gold/25 object-cover shadow-sm"
                    />
                  ) : attachment.type === "video" ? (
                    <video src={attachment.url} controls className="max-h-64 rounded-xl" />
                  ) : attachment.type === "audio" ? (
                    <audio src={attachment.url} controls className="w-full" />
                  ) : (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg border border-gold/30 bg-cream px-3 py-2 text-sm font-medium text-gold-muted hover:bg-gold/10"
                    >
                      {attachment.name ?? attachment.url}
                    </a>
                  )}
                </div>
              ))}
            </>
          )}

          {!isEditing && (showActions || showReactBar) && (
            <div
              className={cn(
                "absolute -top-3 flex items-center gap-1 rounded-full border border-gold/30 bg-cream px-1 py-1 shadow-md",
                isOwn ? "left-2" : "right-2",
              )}
            >
              <button
                type="button"
                onClick={() => setShowReactBar((value) => !value)}
                className="rounded-full px-2 py-1 text-sm hover:bg-gold/15"
                title="React"
              >
                😊
              </button>
              {isOwn && canEdit && (
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="rounded-full p-1.5 text-burgundy/60 hover:bg-gold/15 hover:text-burgundy"
                  title="Edit message"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {(isOwn && canEdit) || isAdmin ? (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-full p-1.5 text-burgundy/60 hover:bg-burgundy/10 hover:text-burgundy"
                  title="Delete message"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          )}

          {showReactBar && (
            <div className="absolute -bottom-12 z-10 rounded-xl border border-gold/30 bg-cream p-1 shadow-lg">
              <QuickEmojiBar onSelect={onToggleReaction} />
            </div>
          )}
        </div>

        {reactionEntries.length > 0 && (
          <div className={cn("mt-2 flex flex-wrap gap-1.5", isOwn && "justify-end")}>
            {reactionEntries.map(([emoji, users]) => {
              const reacted = users.includes(userId);
              return (
                <button
                  key={`${message.id}-${emoji}`}
                  type="button"
                  onClick={() => onToggleReaction(emoji)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition",
                    reacted
                      ? "border-gold bg-gold/20 text-burgundy"
                      : "border-gold/25 bg-cream-dark/80 text-burgundy/80 hover:border-gold/50",
                  )}
                  title={users.length === 1 ? "1 reaction" : `${users.length} reactions`}
                >
                  <span>{emoji}</span>
                  <span className="text-xs font-semibold">{users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {editRemaining && !isEditing && (
          <p className={cn("mt-1 text-[11px] text-burgundy/40", isOwn && "text-right")}>
            {editRemaining}
          </p>
        )}
      </div>
    </div>
  );
}
