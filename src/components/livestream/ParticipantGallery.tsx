"use client";

import { useEffect, useRef } from "react";
import { bindStreamToVideo } from "@/lib/media-video";
import { UserAvatar } from "@/components/UserAvatar";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import type { GalleryMember } from "@/hooks/useLivestream";
import type { HostGalleryLayout } from "@/lib/video-layout";
import { cn } from "@/lib/utils";

type Props = {
  members: GalleryMember[];
  memberVideoEnabled?: boolean;
  memberMicEnabled?: boolean;
  layout?: HostGalleryLayout;
  className?: string;
};

function ParticipantTile({
  member,
  memberVideoEnabled = true,
  memberMicEnabled = true,
  compact = false,
}: {
  member: GalleryMember;
  memberVideoEnabled?: boolean;
  memberMicEnabled?: boolean;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (memberVideoEnabled && member.cameraOn && member.stream) {
      void bindStreamToVideo(el, member.stream);
    } else {
      void bindStreamToVideo(el, null);
    }
  }, [member.cameraOn, member.stream, memberVideoEnabled]);

  const showVideo = memberVideoEnabled && member.cameraOn && member.stream;

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-xl border border-gold/30 bg-burgundy-dark",
        compact ? "w-full" : "w-44 sm:w-48",
      )}
    >
      <div className={cn("relative bg-black", compact ? "aspect-video" : "aspect-[4/3]")}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${showVideo ? "" : "hidden"}`}
        />
        {!showVideo && (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-burgundy px-2 py-3">
            <UserAvatar
              userId={member.userId}
              name={member.name}
              avatarUrl={member.avatarUrl}
              size={compact ? "lg" : "xl"}
              interactive={false}
              className="ring-gold/50"
            />
            <p className="line-clamp-2 text-center text-xs font-medium text-cream sm:text-sm">
              {member.name}
            </p>
          </div>
        )}
        <div className="absolute bottom-1 right-1 flex gap-1">
          {memberMicEnabled && member.micOn ? (
            <span className="rounded-full bg-black/60 p-1 text-gold" title="Mic on">
              <Mic className="h-3 w-3" />
            </span>
          ) : (
            <span className="rounded-full bg-black/60 p-1 text-cream/60" title="Mic off">
              <MicOff className="h-3 w-3" />
            </span>
          )}
          {!memberVideoEnabled || !member.cameraOn ? (
            <span className="rounded-full bg-black/60 p-1 text-cream/60" title="Camera off">
              <VideoOff className="h-3 w-3" />
            </span>
          ) : (
            <span className="rounded-full bg-black/60 p-1 text-gold" title="Camera on">
              <Video className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
      {!compact && (
        <div className="truncate px-2 py-1.5 text-xs font-semibold text-gold-light">
          {member.name}
          {!member.connected && (
            <span className="ml-1 font-normal text-gold-light/50">· joining</span>
          )}
        </div>
      )}
      {compact && !showVideo && (
        <div className="truncate px-2 py-1.5 text-center text-xs font-semibold text-gold-light">
          {member.name}
        </div>
      )}
    </div>
  );
}

export function ParticipantGallery({
  members,
  memberVideoEnabled = true,
  memberMicEnabled = true,
  layout = "bottom",
  className,
}: Props) {
  if (members.length === 0) {
    if (layout === "sidebar") {
      return (
        <div
          className={cn(
            "flex w-44 shrink-0 flex-col justify-center border-l border-gold/20 bg-burgundy-dark/90 p-3 xl:w-52",
            className,
          )}
        >
          <p className="text-center text-xs text-gold-light/60">
            Members will appear here when they join
          </p>
        </div>
      );
    }

    return (
      <div className="shrink-0 border-t border-gold/20 bg-burgundy-dark/80 px-3 py-3">
        <p className="text-center text-sm text-gold-light/60">
          Members will appear here when they join — camera optional
        </p>
      </div>
    );
  }

  if (layout === "sidebar") {
    return (
      <div
        className={cn(
          "flex w-44 shrink-0 flex-col border-l border-gold/20 bg-burgundy-dark/90 xl:w-52",
          className,
        )}
      >
        <p className="shrink-0 border-b border-gold/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gold-light/80">
          Members ({members.length})
        </p>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
          {members.map((member) => (
            <ParticipantTile
              key={member.userId}
              member={member}
              memberVideoEnabled={memberVideoEnabled}
              memberMicEnabled={memberMicEnabled}
              compact
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("shrink-0 border-t border-gold/20 bg-burgundy-dark/90 px-3 py-3", className)}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-light/80">
        Members in room ({members.length})
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {members.map((member) => (
          <ParticipantTile
            key={member.userId}
            member={member}
            memberVideoEnabled={memberVideoEnabled}
            memberMicEnabled={memberMicEnabled}
          />
        ))}
      </div>
    </div>
  );
}
