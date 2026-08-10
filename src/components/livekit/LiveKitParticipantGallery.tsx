"use client";

import { useParticipantTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import type { RemoteParticipant } from "livekit-client";
import type { TrackReference } from "@livekit/components-core";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { LiveKitVideoTile } from "@/components/livekit/LiveKitVideoTile";
import { MuteIndicator } from "@/components/livestream/MuteIndicator";
import { ParticipantSignalBadges } from "@/components/livestream/LivestreamAudienceSignals";
import type { MeetingParticipant } from "@/hooks/useMeetingPresence";
import { cn } from "@/lib/utils";

type Props = {
  participant: RemoteParticipant;
  dbParticipant?: MeetingParticipant;
  memberVideoEnabled: boolean;
  memberMicEnabled: boolean;
  compact?: boolean;
};

function MemberGalleryTile({
  participant,
  dbParticipant,
  memberVideoEnabled,
  memberMicEnabled,
  compact = false,
}: Props) {
  const cameraTracks = useParticipantTracks([Track.Source.Camera], {
    participantIdentity: participant.identity,
  });
  const cameraTrack = cameraTracks.find((t) => t.source === Track.Source.Camera);
  const cameraOn =
    memberVideoEnabled && !!cameraTrack?.publication?.track && participant.isCameraEnabled;
  const micOn = memberMicEnabled && participant.isMicrophoneEnabled;

  const name = dbParticipant?.user.name ?? participant.name ?? participant.identity;
  const avatarUrl = dbParticipant?.user.avatarUrl ?? null;

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-xl border border-gold/30 bg-burgundy-dark",
        compact ? "w-full" : "w-44 sm:w-48",
      )}
    >
      <div className={cn("relative bg-black", compact ? "aspect-video" : "aspect-[4/3]")}>
        <LiveKitVideoTile
          trackRef={cameraTrack}
          userId={participant.identity}
          name={name}
          avatarUrl={avatarUrl}
          cameraOff={!cameraOn}
          compact={compact}
        />
        <ParticipantSignalBadges
          handRaised={dbParticipant?.handRaised}
          reaction={dbParticipant?.reaction}
        />
        <MuteIndicator visible={!micOn} compact={compact} />
        <div className="absolute bottom-1 right-1 flex gap-1">
          {micOn ? (
            <span className="rounded-full bg-black/60 p-1 text-gold">
              <Mic className="h-3 w-3" />
            </span>
          ) : (
            <span className="rounded-full bg-black/60 p-1 text-cream/60">
              <MicOff className="h-3 w-3" />
            </span>
          )}
          {cameraOn ? (
            <span className="rounded-full bg-black/60 p-1 text-gold">
              <Video className="h-3 w-3" />
            </span>
          ) : (
            <span className="rounded-full bg-black/60 p-1 text-cream/60">
              <VideoOff className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
      {!compact && (
        <div className="truncate px-2 py-1.5 text-xs font-semibold text-gold-light">
          {dbParticipant?.handRaised && <span className="mr-1">✋</span>}
          {dbParticipant?.reaction === "UP" && <span className="mr-1">👍</span>}
          {dbParticipant?.reaction === "DOWN" && <span className="mr-1">👎</span>}
          {name}
        </div>
      )}
    </div>
  );
}

type GalleryProps = {
  remoteParticipants: RemoteParticipant[];
  participants: MeetingParticipant[];
  hostId: string;
  hostSelfTile?: {
    participantIdentity: string;
    name: string;
    avatarUrl: string | null;
    trackRef?: TrackReference;
    cameraOff: boolean;
    micOn: boolean;
  } | null;
  memberVideoEnabled: boolean;
  memberMicEnabled: boolean;
  layout?: "sidebar" | "bottom";
};

export function LiveKitParticipantGallery({
  remoteParticipants,
  participants,
  hostId,
  hostSelfTile,
  memberVideoEnabled,
  memberMicEnabled,
  layout = "sidebar",
}: GalleryProps) {
  const members = remoteParticipants.filter((p) => p.identity !== hostId);
  const dbById = new Map(participants.map((p) => [p.user.id, p]));
  const tileCount = members.length + (hostSelfTile ? 1 : 0);

  if (tileCount === 0) {
    const empty = (
      <p className="text-center text-xs text-gold-light/60">
        Members will appear here when they join
      </p>
    );
    return layout === "sidebar" ? (
      <div className="flex w-44 shrink-0 flex-col justify-center border-l border-gold/20 bg-burgundy-dark/90 p-3 xl:w-52">
        {empty}
      </div>
    ) : (
      <div className="shrink-0 border-t border-gold/20 bg-burgundy-dark/80 px-3 py-3">{empty}</div>
    );
  }

  const tiles = (
    <>
      {hostSelfTile && (
        <div
          className={cn(
            "flex shrink-0 flex-col overflow-hidden rounded-xl border border-gold/30 bg-burgundy-dark",
            layout === "sidebar" ? "w-full" : "w-44 sm:w-48",
          )}
        >
          <div
            className={cn(
              "relative bg-black",
              layout === "sidebar" ? "aspect-video" : "aspect-[4/3]",
            )}
          >
            <LiveKitVideoTile
              trackRef={hostSelfTile.trackRef}
              userId={hostSelfTile.participantIdentity}
              name={hostSelfTile.name}
              avatarUrl={hostSelfTile.avatarUrl}
              cameraOff={hostSelfTile.cameraOff}
              compact={layout === "sidebar"}
            />
            <MuteIndicator visible={!hostSelfTile.micOn} compact={layout === "sidebar"} />
          </div>
        </div>
      )}
      {members.map((participant) => (
        <MemberGalleryTile
          key={participant.identity}
          participant={participant}
          dbParticipant={dbById.get(participant.identity)}
          memberVideoEnabled={memberVideoEnabled}
          memberMicEnabled={memberMicEnabled}
          compact={layout === "sidebar"}
        />
      ))}
    </>
  );

  if (layout === "sidebar") {
    return (
      <div className="flex w-44 shrink-0 flex-col border-l border-gold/20 bg-burgundy-dark/90 xl:w-52">
        <p className="shrink-0 border-b border-gold/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gold-light/80">
          In room ({tileCount})
        </p>
        <div className="chat-scroll chat-scroll-dark min-h-0 flex-1 space-y-2 p-2">{tiles}</div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-gold/20 bg-burgundy-dark/90 px-3 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-light/80">
        In room ({tileCount})
      </p>
      <div className="chat-scroll flex gap-3 pb-1">{tiles}</div>
    </div>
  );
}
