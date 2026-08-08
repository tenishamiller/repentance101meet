"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import type { TimelineEvent } from "@/lib/member-timeline";

type MemberInfo = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  createdAt: string;
};

type Props = {
  userId: string | null;
  onClose: () => void;
};

export function MemberDetailPanel({ userId, onClose }: Props) {
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${userId}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setMember(data.user);
        setTimeline(data.timeline);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchTimeline();
  }, [fetchTimeline]);

  async function saveReason(event: TimelineEvent) {
    if (!userId || !event.logId) return;
    const reason = reasonDrafts[event.id]?.trim();
    if (!reason) return;

    setSavingId(event.id);
    await fetch(`/api/admin/members/${userId}/timeline`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId: event.logId, reason }),
    });
    setSavingId(null);
    void fetchTimeline();
  }

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-burgundy/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col bg-cream shadow-2xl">
        <div className="flex items-center justify-between border-b border-gold/20 px-5 py-4">
          <h2 className="font-serif text-xl font-semibold text-burgundy">Member History</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-burgundy/60 hover:bg-burgundy/5 hover:text-burgundy"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {loading && !member ? (
            <p className="text-burgundy/60">Loading...</p>
          ) : member ? (
            <>
              <div className="mb-6 flex items-center gap-4">
                <UserAvatar
                  userId={member.id}
                  name={member.name}
                  avatarUrl={member.avatarUrl}
                  size="lg"
                  interactive={false}
                />
                <div>
                  <p className="font-serif text-xl font-semibold text-burgundy">{member.name}</p>
                  <p className="text-sm text-burgundy/60">{member.email}</p>
                  <p className="mt-1 text-xs text-burgundy/50">
                    Status: {member.status === "REJECTED" ? "DENIED" : member.status}
                  </p>
                </div>
              </div>

              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-burgundy/55">
                Activity timeline
              </h3>

              {timeline.length === 0 ? (
                <p className="text-sm text-burgundy/60">No activity recorded yet.</p>
              ) : (
                <ol className="relative space-y-0 border-l-2 border-gold/25 pl-5">
                  {timeline.map((event) => (
                    <li key={event.id} className="relative pb-6 last:pb-0">
                      <span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-cream bg-gold" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-gold-muted">
                        {event.occurredAt}
                      </p>
                      <p className="mt-0.5 font-medium text-burgundy">{event.label}</p>
                      {event.reason && (
                        <p className="mt-1 text-sm text-burgundy/65">
                          Reason: {event.reason}
                        </p>
                      )}
                      {event.editable && event.logId && (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={reasonDrafts[event.id] ?? ""}
                            onChange={(e) =>
                              setReasonDrafts((prev) => ({ ...prev, [event.id]: e.target.value }))
                            }
                            placeholder="Add removal reason..."
                            rows={2}
                            className="input-field !py-2 text-sm"
                          />
                          <button
                            type="button"
                            disabled={savingId === event.id || !reasonDrafts[event.id]?.trim()}
                            onClick={() => void saveReason(event)}
                            className="btn-outline-gold !px-3 !py-1.5 text-xs disabled:opacity-50"
                          >
                            {savingId === event.id ? "Saving..." : "Save reason"}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            <p className="text-burgundy/60">Could not load member details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
