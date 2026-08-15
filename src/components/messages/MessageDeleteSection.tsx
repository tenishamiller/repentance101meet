"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Search, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { MemberSearchPicker } from "@/components/admin/MemberSearchPicker";
import { formatRequestDateTime } from "@/lib/utils";
import {
  formatMessageThreadDeleteCountdown,
  isMessageThreadPendingDeletion,
} from "@/lib/message-thread-deletion-shared";
import type { Member } from "@/components/admin/types";

export type DeletedThreadSummary = {
  conversationId: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  lastMessage?: { content: string; createdAt: string; type?: string } | null;
  conversation: {
    id: string;
    deletedAt: string | null;
    purgeAt: string | null;
  };
  deletedBy?: { id: string; name: string } | null;
};

type Props = {
  isAdmin: boolean;
  activeConversationId: string | null;
  activeConversationName: string | null;
  selectedMember: Member | null;
  onSelectMember?: (member: Member | null) => void;
  deletedThreads: DeletedThreadSummary[];
  onSoftDeleteActive: () => Promise<void>;
  onRestore: (conversationId: string) => Promise<void>;
  onPermanentDelete: (conversationId: string) => Promise<void>;
  busyAction: string | null;
};

function ThreadDeleteCountdown({ purgeAt }: { purgeAt: string }) {
  const [label, setLabel] = useState(() => formatMessageThreadDeleteCountdown(purgeAt));

  useEffect(() => {
    setLabel(formatMessageThreadDeleteCountdown(purgeAt));
    const timer = window.setInterval(() => {
      setLabel(formatMessageThreadDeleteCountdown(purgeAt));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [purgeAt]);

  return <span>{label}</span>;
}

export function MessageDeleteSection({
  isAdmin,
  activeConversationId,
  activeConversationName,
  selectedMember,
  onSelectMember,
  deletedThreads,
  onSoftDeleteActive,
  onRestore,
  onPermanentDelete,
  busyAction,
}: Props) {
  const [confirmSoftDelete, setConfirmSoftDelete] = useState(false);
  const [permanentId, setPermanentId] = useState<string | null>(null);
  const [confirmPermanentChecked, setConfirmPermanentChecked] = useState(false);
  const [filter, setFilter] = useState("");

  const searchLower = filter.trim().toLowerCase();
  const visibleDeleted = deletedThreads.filter((thread) => {
    if (!searchLower) return true;
    return (
      thread.name.toLowerCase().includes(searchLower) ||
      (thread.email ?? "").toLowerCase().includes(searchLower) ||
      (thread.lastMessage?.content ?? "").toLowerCase().includes(searchLower)
    );
  });

  const busy = Boolean(busyAction);

  return (
    <section className="card-brand shrink-0 p-4 sm:p-5">
      <h2 className="font-serif text-xl font-semibold text-burgundy">Delete</h2>
      <p className="mt-1 text-sm text-burgundy/60">
        Delete a whole conversation thread — not single messages. Deleted threads can be restored
        for 30 days. After that they are removed forever. A new message always starts a fresh
        thread, never the deleted one.
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

      <div className="mt-5 rounded-xl border border-gold/25 bg-cream-dark/70 p-4">
        <h3 className="text-sm font-semibold text-burgundy">Current thread</h3>
        {!activeConversationId || !activeConversationName ? (
          <p className="mt-2 text-sm text-burgundy/60">
            {isAdmin
              ? "Search for a member or open a conversation first."
              : "Open a conversation to delete its thread."}
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-burgundy/75">
              Conversation with <span className="font-semibold">{activeConversationName}</span>
            </p>
            {!confirmSoftDelete ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmSoftDelete(true)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-burgundy/30 bg-burgundy/5 px-4 py-2 text-sm font-semibold text-burgundy hover:bg-burgundy/10 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete this thread
              </button>
            ) : (
              <div className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50/90 px-4 py-4">
                <p className="text-sm font-medium text-burgundy">
                  Delete the whole thread with {activeConversationName}? You can restore it within
                  30 days. New messages after this will start a brand-new thread.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      await onSoftDeleteActive();
                      setConfirmSoftDelete(false);
                    }}
                    className="rounded-lg bg-burgundy px-4 py-2 text-sm font-semibold text-cream hover:bg-burgundy-dark disabled:opacity-60"
                  >
                    {busyAction === "soft-delete" ? "Deleting..." : "Delete thread"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmSoftDelete(false)}
                    className="rounded-lg border border-burgundy/25 px-4 py-2 text-sm font-medium text-burgundy hover:bg-burgundy/5 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-burgundy">Deleted threads (30-day restore)</h3>
            <p className="text-xs text-burgundy/55">
              Restore to continue that conversation, or permanently delete with confirmation.
            </p>
          </div>
          {deletedThreads.length > 4 && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-burgundy/40" />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search deleted threads..."
                className="input-field !pl-10 text-sm"
              />
            </div>
          )}
        </div>

        {visibleDeleted.length === 0 ? (
          <p className="rounded-xl bg-cream-dark px-4 py-5 text-center text-sm text-burgundy/60">
            No deleted threads in the restore window.
          </p>
        ) : (
          <ul className="max-h-80 space-y-3 overflow-y-auto">
            {visibleDeleted.map((thread) => {
              const pending = isMessageThreadPendingDeletion(thread.conversation);
              const confirmingPermanent = permanentId === thread.conversationId;
              return (
                <li
                  key={thread.conversationId}
                  className="rounded-xl border border-gold/25 bg-cream-dark px-3 py-3"
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      userId={thread.conversationId}
                      name={thread.name}
                      avatarUrl={thread.avatarUrl ?? null}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-burgundy">{thread.name}</p>
                      {thread.email && (
                        <p className="truncate text-xs text-burgundy/55">{thread.email}</p>
                      )}
                      {thread.conversation.deletedAt && (
                        <p className="mt-1 text-[11px] text-burgundy/50">
                          Deleted {formatRequestDateTime(thread.conversation.deletedAt)}
                          {thread.deletedBy ? ` by ${thread.deletedBy.name}` : ""}
                        </p>
                      )}
                      {thread.lastMessage && (
                        <p className="mt-1 line-clamp-2 text-sm text-burgundy/80">
                          {thread.lastMessage.content.trim() || "Attachment"}
                        </p>
                      )}
                      {pending && thread.conversation.purgeAt && (
                        <p className="mt-1 text-xs font-medium text-burgundy/70">
                          Restore window:{" "}
                          <ThreadDeleteCountdown purgeAt={thread.conversation.purgeAt} />
                        </p>
                      )}
                    </div>
                  </div>

                  {pending && !confirmingPermanent && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onRestore(thread.conversationId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gold/40 bg-cream px-3 py-1.5 text-xs font-semibold text-burgundy hover:bg-gold/10 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {busyAction === `restore:${thread.conversationId}`
                          ? "Restoring..."
                          : "Restore thread"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setPermanentId(thread.conversationId);
                          setConfirmPermanentChecked(false);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-burgundy/30 px-3 py-1.5 text-xs font-semibold text-burgundy hover:bg-burgundy/5 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Permanently delete
                      </button>
                    </div>
                  )}

                  {confirmingPermanent && (
                    <div className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50/90 px-4 py-4">
                      <p className="text-sm font-medium text-burgundy">
                        Permanently delete the thread with {thread.name}? This cannot be undone.
                      </p>
                      <label className="mt-3 flex items-start gap-2 text-sm text-burgundy">
                        <input
                          type="checkbox"
                          checked={confirmPermanentChecked}
                          onChange={(e) => setConfirmPermanentChecked(e.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          I understand this permanently deletes the entire conversation and it
                          cannot be restored.
                        </span>
                      </label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || !confirmPermanentChecked}
                          onClick={async () => {
                            await onPermanentDelete(thread.conversationId);
                            setPermanentId(null);
                            setConfirmPermanentChecked(false);
                          }}
                          className="rounded-lg bg-burgundy px-4 py-2 text-sm font-semibold text-cream hover:bg-burgundy-dark disabled:opacity-60"
                        >
                          {busyAction === `purge:${thread.conversationId}`
                            ? "Deleting..."
                            : "Confirm permanent delete"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setPermanentId(null);
                            setConfirmPermanentChecked(false);
                          }}
                          className="rounded-lg border border-burgundy/25 px-4 py-2 text-sm font-medium text-burgundy hover:bg-burgundy/5 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
