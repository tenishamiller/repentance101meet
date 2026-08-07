"use client";

import { useEffect, useRef } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import type { GalleryMember } from "@/hooks/useLivestream";

type Props = {
  members: GalleryMember[];
  memberVideoEnabled?: boolean;
  memberMicEnabled?: boolean;
};

function ParticipantTile({
  member,
  memberVideoEnabled = true,
  memberMicEnabled = true,
}: {
  member: GalleryMember;
  memberVideoEnabled?: boolean;
  memberMicEnabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (memberVideoEnabled && member.cameraOn && member.stream) {
      if (el.srcObject !== member.stream) {
        el.srcObject = member.stream;
      }
    } else {
      el.srcObject = null;
    }
  }, [member.cameraOn, member.stream, memberVideoEnabled]);

  const showVideo = memberVideoEnabled && member.cameraOn && member.stream;

  return (
    <div className="flex w-36 shrink-0 flex-col overflow-hidden rounded-xl border border-gold/30 bg-burgundy-dark sm:w-40">
      <div className="relative aspect-video bg-black">
        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-burgundy px-2">
            <UserAvatar
              userId={member.userId}
              name={member.name}
              avatarUrl={member.avatarUrl}
              size="md"
            />
            <p className="line-clamp-2 text-center text-xs font-medium text-cream">{member.name}</p>
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
      <div className="truncate px-2 py-1.5 text-xs font-semibold text-gold-light">
        {member.name}
        {!member.connected && (
          <span className="ml-1 font-normal text-gold-light/50">· joining</span>
        )}
      </div>
    </div>
  );
}

export function ParticipantGallery({
  members,
  memberVideoEnabled = true,
  memberMicEnabled = true,
}: Props) {
  if (members.length === 0) {
    return (
      <div className="shrink-0 border-t border-gold/20 bg-burgundy-dark/80 px-3 py-3">
        <p className="text-center text-sm text-gold-light/60">
          Members will appear here when they join — camera optional
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-gold/20 bg-burgundy-dark/90 px-3 py-3">
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
