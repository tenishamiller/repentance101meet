"use client";

import { useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { MemberSearchPicker } from "@/components/admin/MemberSearchPicker";
import { formatRequestDateTime } from "@/lib/utils";
import type { Member } from "@/components/admin/types";
import type { MembershipMessageData } from "@/components/messages/MembershipMessageBubble";

type Props = {
  isAdmin: boolean;
  conversationName: string | null;
  messages: MembershipMessageData[];
  currentUserId?: string;
  selectedMember: Member | null;
  onSelectMember?: (member: Member | null) => void;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onDeleteConversation: () => Promise<void>;
  canDeleteConversation: boolean;
  deletingId: string | null;
  deletingAll: boolean;
  deleteAllLabel?: string;
  deleteAllDescription?: string;
};

function previewText(message: MembershipMessageData) {
  const text = message.content.trim();
  if (text) return text.length > 90 ? `${text.slice(0, 90)}…` : text;
  if (message.attachments && message.attachments.length > 0) return "Attachment";
  if (message.type === "ONBOARDING_INVITE") return "One-on-one invite";
  if (message.type === "QUESTIONNAIRE_RETAKE") return "Survey retake request";
  return "Message";
}

export function MessageDeleteSection({
  isAdmin,
  conversationName,
  messages,
  currentUserId,
  selectedMember,
  onSelectMember,
  onDeleteMessage,
  onDeleteConversation,
  canDeleteConversation,
  deletingId,
  deletingAll,
  deleteAllLabel = "Delete entire conversation",
  deleteAllDescription,
}: Props) {
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const deletableMessages = isAdmin
    ? messages
    : messages.filter((message) => message.sender.id === currentUserId && message.type === "TEXT");

  const searchLower = filter.trim().toLowerCase();
  const visible = deletableMessages.filter((message) => {
    if (!searchLower) return true;
    return (
      previewText(message).toLowerCase().includes(searchLower) ||
      message.sender.name.toLowerCase().includes(searchLower)
    );
  });

  const busy = Boolean(deletingId) || deletingAll;

  return (
    <section className="card-brand shrink-0 p-4 sm:p-5">
      <h2 className="font-serif text-xl font-semibold text-burgundy">Delete</h2>
      <p className="mt-1 text-sm text-burgundy/60">
        {isAdmin
          ? "Search a member, then permanently delete messages or the whole conversation."
          : "Permanently delete your messages in this conversation. This cannot be undone."}
      </p>

      {isAdmin && onSelectMember && (
        <div className="mt-4">
          <MemberSearchPicker
            value={selectedMember}
            onChange={onSelectMember}
            placeholder="Search by name or email..."
            status="ALL"
          />
        </div>
      )}

      {!conversationName ? (
        <p className="mt-4 rounded-xl bg-cream-dark px-4 py-5 text-center text-sm text-burgundy/60">
          {isAdmin
            ? "Search for a member to delete their messages."
            : "Open a conversation to delete messages."}
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm font-semibold text-burgundy">
            {deletableMessages.length} message{deletableMessages.length === 1 ? "" : "s"} with{" "}
            {conversationName}
          </p>

          {deletableMessages.length > 6 && (
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-burgundy/40" />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search messages..."
                className="input-field !pl-10 text-sm"
              />
            </div>
          )}

          {visible.length === 0 ? (
            <p className="mt-3 rounded-xl bg-cream-dark px-4 py-5 text-center text-sm text-burgundy/60">
              {deletableMessages.length === 0
                ? "No messages to delete in this conversation."
                : "No messages match your search."}
            </p>
          ) : (
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {visible.map((message) => {
                const confirming = confirmId === message.id;
                return (
                  <li
                    key={message.id}
                    className="rounded-xl border border-gold/25 bg-cream-dark px-3 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        userId={message.sender.id}
                        name={message.sender.name}
                        avatarUrl={message.sender.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-burgundy">
                          {message.sender.name}
                        </p>
                        <p className="text-[11px] text-burgundy/50">
                          {formatRequestDateTime(message.createdAt)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-burgundy/80">
                          {previewText(message)}
                        </p>
                      </div>
                      {!confirming ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirmId(message.id)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-burgundy/25 px-2.5 py-1.5 text-xs font-semibold text-burgundy hover:bg-burgundy/5 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      ) : (
                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              await onDeleteMessage(message.id);
                              setConfirmId(null);
                            }}
                            className="rounded-lg bg-burgundy px-2.5 py-1.5 text-xs font-semibold text-cream hover:bg-burgundy-dark disabled:opacity-50"
                          >
                            {deletingId === message.id ? "Deleting..." : "Confirm"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirmId(null)}
                            className="rounded-lg border border-burgundy/25 px-2.5 py-1.5 text-xs font-medium text-burgundy disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {canDeleteConversation && deletableMessages.length > 0 && (
            <div className="mt-4 border-t border-gold/20 pt-4">
              {!confirmAll ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmAll(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-burgundy/30 bg-burgundy/5 px-4 py-2 text-sm font-semibold text-burgundy hover:bg-burgundy/10 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteAllLabel}
                </button>
              ) : (
                <div className="rounded-xl border border-amber-300/60 bg-amber-50/90 px-4 py-4">
                  <p className="text-sm font-medium text-burgundy">
                    {deleteAllDescription ??
                      `Delete every message with ${conversationName}? This cannot be undone.`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        await onDeleteConversation();
                        setConfirmAll(false);
                      }}
                      className="rounded-lg bg-burgundy px-4 py-2 text-sm font-semibold text-cream hover:bg-burgundy-dark disabled:opacity-60"
                    >
                      {deletingAll ? "Deleting..." : "Confirm delete"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmAll(false)}
                      className="rounded-lg border border-burgundy/25 px-4 py-2 text-sm font-medium text-burgundy hover:bg-burgundy/5 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
