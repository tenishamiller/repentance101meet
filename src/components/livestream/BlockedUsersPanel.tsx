"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { ShowMoreList } from "@/components/ShowMoreList";

type BlockedEntry = {
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  blockId: string | null;
  blockedInMeeting: boolean;
};

export function BlockedUsersPanel({ meetingToken }: { meetingToken: string }) {
  const [blocked, setBlocked] = useState<BlockedEntry[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchBlocked = useCallback(async () => {
    const res = await fetch(`/api/meetings/${meetingToken}/blocks`);
    if (res.ok) {
      const data = await res.json();
      setBlocked(data.blocked ?? []);
    }
  }, [meetingToken]);

  useEffect(() => {
    void fetchBlocked();
    const interval = setInterval(() => void fetchBlocked(), 5000);
    return () => clearInterval(interval);
  }, [fetchBlocked]);

  async function unblock(entry: BlockedEntry) {
    setBusyId(entry.user.id);
    await fetch(`/api/meetings/${meetingToken}/blocks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: entry.user.id,
        blockId: entry.blockId ?? undefined,
      }),
    });
    setBusyId(null);
    void fetchBlocked();
  }

  if (blocked.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-gold/30 bg-burgundy-dark/80 p-2.5">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gold-light">
        <Ban className="h-3.5 w-3.5" />
        Blocked ({blocked.length})
      </p>
      <ShowMoreList
        items={blocked}
        initialCount={5}
        step={5}
        maxHeightClass="max-h-28"
        listClassName="space-y-1.5"
        moreLabel="blocked users"
        getKey={(entry) => entry.user.id}
        renderItem={(entry) => (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-gold/10 bg-burgundy px-2 py-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <UserAvatar
                userId={entry.user.id}
                name={entry.user.name}
                avatarUrl={entry.user.avatarUrl}
                size="sm"
              />
              <span className="truncate text-sm text-cream">{entry.user.name}</span>
            </div>
            <button
              type="button"
              disabled={busyId === entry.user.id}
              onClick={() => void unblock(entry)}
              className="shrink-0 rounded-md border border-gold/40 bg-gold/15 px-2 py-1 text-xs font-semibold text-gold-light hover:bg-gold/25 disabled:opacity-50"
            >
              {busyId === entry.user.id ? "..." : "Unblock"}
            </button>
          </div>
        )}
      />
    </div>
  );
}
