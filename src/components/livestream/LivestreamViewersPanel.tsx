"use client";

import { ThumbsDown, ThumbsUp, Users, MicOff } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { BlockedUsersPanel } from "@/components/livestream/BlockedUsersPanel";
import { cn } from "@/lib/utils";

type Viewer = {
  user: { id: string; name: string; avatarUrl: string | null };
  handRaised?: boolean;
  reaction?: string | null;
};

type Props = {
  className?: string;
  meetingToken: string;
  viewerCount: number;
  viewers: Viewer[];
  raisedHands: { userId: string; name: string }[];
  thumbsUp: number;
  thumbsDown: number;
  clapCount: number;
  memberMicEnabled: boolean;
  viewerMicOnById: Map<string, boolean>;
  privateMessageMemberId: string | null;
  onTogglePrivateMessage: (member: {
    id: string;
    name: string;
    avatarUrl: string | null;
  }) => void;
  onKickViewer: (userId: string) => void;
};

export function LivestreamViewersPanel({
  className,
  meetingToken,
  viewerCount,
  viewers,
  raisedHands,
  thumbsUp,
  thumbsDown,
  clapCount,
  memberMicEnabled,
  viewerMicOnById,
  privateMessageMemberId,
  onTogglePrivateMessage,
  onKickViewer,
}: Props) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden border-b border-gold/20 bg-burgundy",
        className,
      )}
    >
      <div className="shrink-0 px-3 pb-2 pt-3 sm:px-4 sm:pt-4">
        {(thumbsUp > 0 || thumbsDown > 0 || clapCount > 0) && (
          <div className="mb-2 flex gap-2 text-sm">
            {thumbsUp > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-1 font-semibold text-gold-light">
                <ThumbsUp className="h-3.5 w-3.5" />
                {thumbsUp}
              </span>
            )}
            {clapCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-1 font-semibold text-gold-light">
                <span aria-hidden>👏</span>
                {clapCount}
              </span>
            )}
            {thumbsDown > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-burgundy-dark px-2.5 py-1 font-semibold text-cream/80">
                <ThumbsDown className="h-3.5 w-3.5" />
                {thumbsDown}
              </span>
            )}
          </div>
        )}
        <h3 className="flex items-center gap-2 font-serif text-sm font-semibold text-gold-light">
          <Users className="h-4 w-4 text-gold" />
          Viewers ({viewerCount})
        </h3>
      </div>
      <div className="livestream-panel-scroll chat-scroll chat-scroll-dark min-h-0 flex-1 overflow-y-auto overscroll-y-contain space-y-1.5 px-3 pb-3 sm:px-4 sm:pb-4">
        {viewers.length === 0 ? (
          <p className="text-sm text-gold-light/60">Waiting for viewers to join...</p>
        ) : (
          viewers.map((p) => (
            <div
              key={p.user.id}
              className="flex items-center justify-between rounded-lg border border-gold/10 bg-burgundy-dark px-2.5 py-1.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <UserAvatar
                  userId={p.user.id}
                  name={p.user.name}
                  avatarUrl={p.user.avatarUrl}
                  size="md"
                />
                <span className="truncate text-sm text-cream">{p.user.name}</span>
                {p.handRaised && <span title="Hand raised">✋</span>}
                {(!memberMicEnabled || viewerMicOnById.get(p.user.id) === false) && (
                  <MicOff
                    className="h-3.5 w-3.5 shrink-0 text-gold-light/70"
                    aria-label="Muted"
                  />
                )}
                {p.reaction === "UP" && (
                  <ThumbsUp className="h-3.5 w-3.5 shrink-0 text-gold" aria-label="Thumbs up" />
                )}
                {p.reaction === "CLAP" && (
                  <span className="shrink-0 text-sm leading-none" title="Clapping" aria-label="Clapping">
                    👏
                  </span>
                )}
                {p.reaction === "DOWN" && (
                  <ThumbsDown
                    className="h-3.5 w-3.5 shrink-0 text-cream/70"
                    aria-label="Thumbs down"
                  />
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onTogglePrivateMessage({
                      id: p.user.id,
                      name: p.user.name,
                      avatarUrl: p.user.avatarUrl,
                    })
                  }
                  className={`text-xs font-semibold ${
                    privateMessageMemberId === p.user.id
                      ? "text-gold-light"
                      : "text-gold hover:text-gold-light"
                  }`}
                >
                  Message
                </button>
                <button
                  type="button"
                  onClick={() => onKickViewer(p.user.id)}
                  className="text-xs text-gold-light/70 hover:text-gold"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}

        {raisedHands.length > 0 && (
          <div className="mt-2 rounded-lg border border-gold/40 bg-gold/10 p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">Raised Hands</p>
            <ul className="mt-1 space-y-0.5">
              {raisedHands.map((p) => (
                <li key={p.userId} className="text-sm text-cream">
                  ✋ {p.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <BlockedUsersPanel meetingToken={meetingToken} />
      </div>
    </section>
  );
}
