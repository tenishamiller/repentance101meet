"use client";

import { ShowMoreList } from "@/components/ShowMoreList";

type Meeting = {
  id: string;
  title: string;
  status: string;
};

export function UpcomingMeetingsList({ meetings }: { meetings: Meeting[] }) {
  if (meetings.length === 0) {
    return null;
  }

  return (
    <div className="card-brand p-6">
      <h3 className="mb-3 font-serif text-lg font-semibold text-burgundy">Sessions</h3>
      <ShowMoreList
        items={meetings}
        initialCount={4}
        step={4}
        listClassName="space-y-3"
        moreLabel="sessions"
        getKey={(m) => m.id}
        renderItem={(m) => (
          <div className="rounded-xl bg-cream-dark px-4 py-3 text-sm">
            <p className="font-medium text-burgundy">{m.title}</p>
            <p className="mt-0.5 text-burgundy/60">
              {m.status === "LIVE" ? (
                <span className="font-semibold text-gold-muted">● Live now</span>
              ) : (
                "Scheduled — waiting for the host to start"
              )}
            </p>
          </div>
        )}
      />
    </div>
  );
}
