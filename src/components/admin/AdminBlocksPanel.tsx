"use client";

import { useState } from "react";
import { Ban, ShieldOff } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { ShowMoreList } from "@/components/ShowMoreList";
import { formatDate } from "@/lib/utils";
import { MemberSearchPicker } from "./MemberSearchPicker";
import type { Block, Member } from "./types";

type Props = {
  blocks: Block[];
  onUnblock: (blockId: string) => void;
  onBlock: (userId: string, reason: string) => void;
};

export function AdminBlocksPanel({ blocks, onUnblock, onBlock }: Props) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [blockReason, setBlockReason] = useState("");

  const activeBlocks = blocks.filter((b) => !b.unblockedAt);

  function handleBlock() {
    if (!selectedMember) return;
    onBlock(selectedMember.id, blockReason);
    setSelectedMember(null);
    setBlockReason("");
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <section className="card-brand p-6">
        <h2 className="mb-1 font-serif text-xl font-semibold text-burgundy">Block a User</h2>
        <p className="mb-4 text-sm text-burgundy/60">
          Blocked users cannot join meetings or access the site. You can also block during a live
          session from the meeting chat.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <MemberSearchPicker
            value={selectedMember}
            onChange={setSelectedMember}
            placeholder="Search approved member to block..."
            status="APPROVED"
          />
          <input
            type="text"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            className="input-field"
            placeholder="Reason (optional)"
          />
        </div>
        <button
          type="button"
          disabled={!selectedMember}
          onClick={handleBlock}
          className="btn-burgundy mt-4 inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Ban className="h-4 w-4" />
          Block User
        </button>
      </section>

      <section className="card-brand p-6">
        <h2 className="mb-4 font-serif text-xl font-semibold text-burgundy">
          Active Blocks ({activeBlocks.length})
        </h2>
        {activeBlocks.length === 0 ? (
          <p className="rounded-xl bg-cream-dark px-4 py-6 text-center text-burgundy/60">
            No users are currently blocked.
          </p>
        ) : (
          <ShowMoreList
            items={activeBlocks}
            initialCount={5}
            step={5}
            listClassName="space-y-3"
            moreLabel="blocks"
            getKey={(b) => b.id}
            renderItem={(b) => (
              <div className="flex flex-col gap-4 rounded-xl border border-gold/25 bg-cream-dark p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    userId={b.user.id}
                    name={b.user.name}
                    avatarUrl={b.user.avatarUrl}
                    size="md"
                  />
                  <div>
                    <p className="font-semibold text-burgundy">{b.user.name}</p>
                    <p className="text-sm text-burgundy/60">{b.user.email}</p>
                    {b.reason && (
                      <p className="mt-1 text-xs text-burgundy/50">Reason: {b.reason}</p>
                    )}
                    <p className="text-xs text-burgundy/45">Blocked {formatDate(b.createdAt)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onUnblock(b.id)}
                  className="btn-outline-gold inline-flex items-center gap-1.5 !px-4 !py-2 text-sm"
                >
                  <ShieldOff className="h-4 w-4" />
                  Unblock
                </button>
              </div>
            )}
          />
        )}
      </section>

      {blocks.filter((b) => b.unblockedAt).length > 0 && (
        <section className="card-brand p-6 opacity-80">
          <h2 className="mb-3 font-serif text-lg font-semibold text-burgundy">Past Blocks</h2>
          <ul className="max-h-48 space-y-2 overflow-y-auto text-sm text-burgundy/60">
            {blocks
              .filter((b) => b.unblockedAt)
              .slice(0, 10)
              .map((b) => (
                <li key={b.id}>
                  {b.user.name} — unblocked {b.unblockedAt ? formatDate(b.unblockedAt) : ""}
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
