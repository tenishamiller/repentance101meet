"use client";

import { useParticipantTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import type { RemoteParticipant } from "livekit-client";
import type { TrackReference } from "@livekit/components-core";
import { VideoOff } from "lucide-react";
import { LiveKitVideoTile } from "@/components/livekit/LiveKitVideoTile";
import { ParticipantSignalBadges } from "@/components/livestream/LivestreamAudienceSignals";
import { ParticipantPanelNameRow } from "@/components/livestream/ParticipantPanelNameRow";
import type { MeetingParticipant } from "@/hooks/useMeetingPresence";
import { avatarUrlFromLiveKitMetadata } from "@/lib/avatar-url";
import { PANEL_TILE_CARD_CLASS, PANEL_TILE_FRAME_CLASS } from "@/lib/panel-tile";
import { cn } from "@/lib/utils";

type Props = {
  participant: RemoteParticipant;
  dbParticipant?: MeetingParticipant;
  memberVideoEnabled: boolean;
  memberMicEnabled: boolean;
  compact?: boolean;
};

function displayName(name: string, dbParticipant?: MeetingParticipant) {
  const prefix: string[] = [];
  if (dbParticipant?.handRaised) prefix.push("✋");
  if (dbParticipant?.reaction === "UP") prefix.push("👍");
  if (dbParticipant?.reaction === "DOWN") prefix.push("👎");
  return prefix.length > 0 ? `${prefix.join(" ")} ${name}` : name;
}

function memberAvatarUrl(
  participant: RemoteParticipant,
  dbParticipant?: MeetingParticipant,
) {
  return (
    dbParticipant?.user.avatarUrl ??
    avatarUrlFromLiveKitMetadata(participant.metadata) ??
    null
  );
}

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
  const cameraPublication = cameraTrack?.publication;
  const cameraOn =
    memberVideoEnabled &&
    !!cameraPublication?.track &&
    participant.isCameraEnabled &&
    !cameraPublication.isMuted;

  const micOn = memberMicEnabled && participant.isMicrophoneEnabled;

  const name = dbParticipant?.user.name ?? participant.name ?? participant.identity;
  const avatarUrl = memberAvatarUrl(participant, dbParticipant);

  return (
    <div
      className={cn(
        PANEL_TILE_CARD_CLASS,
        compact ? "w-full" : "w-44 sm:w-48",
      )}
    >
      <div className={PANEL_TILE_FRAME_CLASS}>
        <LiveKitVideoTile
          trackRef={cameraTrack}
          userId={participant.identity}
          name={name}
          avatarUrl={avatarUrl}
          cameraOff={!cameraOn}
          compact={compact}
          panelLayout={compact}
        />
        <ParticipantSignalBadges
          handRaised={dbParticipant?.handRaised}
          reaction={dbParticipant?.reaction}
        />
        {!cameraOn && (
          <span className="absolute bottom-1 right-1 rounded-full bg-black/60 p-1 text-cream/60">
            <VideoOff className="h-3 w-3" />
          </span>
        )}
      </div>
      <ParticipantPanelNameRow name={displayName(name, dbParticipant)} muted={!micOn} />
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
  side?: "left" | "right";
};

export function LiveKitParticipantGallery({
  remoteParticipants,
  participants,
  hostId,
  hostSelfTile,
  memberVideoEnabled,
  memberMicEnabled,
  layout = "sidebar",
  side = "right",
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
      <div
        className={cn(
          "flex min-h-0 w-44 shrink-0 flex-col self-stretch overflow-hidden bg-burgundy-dark/90 xl:w-52",
          side === "left" ? "border-r border-gold/20" : "border-l border-gold/20",
        )}
      >
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
            PANEL_TILE_CARD_CLASS,
            layout === "sidebar" ? "w-full" : "w-44 sm:w-48",
          )}
        >
          <div className={PANEL_TILE_FRAME_CLASS}>
            <LiveKitVideoTile
              trackRef={hostSelfTile.trackRef}
              userId={hostSelfTile.participantIdentity}
              name={hostSelfTile.name}
              avatarUrl={hostSelfTile.avatarUrl}
              cameraOff={hostSelfTile.cameraOff}
              compact={layout === "sidebar"}
              panelLayout={layout === "sidebar"}
            />
          </div>
          <ParticipantPanelNameRow name={hostSelfTile.name} muted={!hostSelfTile.micOn} />
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
      <div
        className={cn(
          "flex min-h-0 w-44 shrink-0 flex-col self-stretch overflow-hidden bg-burgundy-dark/90 xl:w-52",
          side === "left" ? "border-r border-gold/20" : "border-l border-gold/20",
        )}
      >
        <p className="shrink-0 border-b border-gold/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gold-light/80">
          In room ({tileCount})
        </p>
        <div className="chat-scroll chat-scroll-dark min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
          {tiles}
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-h-48 shrink-0 flex-col overflow-hidden border-t border-gold/20 bg-burgundy-dark/90">
      <p className="shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gold-light/80">
        In room ({tileCount})
      </p>
      <div className="chat-scroll chat-scroll-dark flex gap-3 overflow-x-auto px-3 pb-3">
        {tiles}
      </div>
    </div>
  );
}
