"use client";

import { useEffect } from "react";
import { AudioTrack, useRemoteParticipants, useRoomContext, useTracks } from "@livekit/components-react";
import { getTrackReferenceId } from "@livekit/components-core";
import { Track } from "livekit-client";

type Props = {
  hostId: string;
  isHost: boolean;
  /** When false, the host does not receive member microphone or screen-share audio. */
  memberMicEnabled: boolean;
};

function isAudioSource(source: Track.Source) {
  return (
    source === Track.Source.Microphone ||
    source === Track.Source.ScreenShareAudio
  );
}

/** Livestream audio routing: members hear only the host; host hears members only when allowed. */
export function LivestreamRoomAudio({ hostId, isHost, memberMicEnabled }: Props) {
  const room = useRoomContext();
  const remoteParticipants = useRemoteParticipants();
  const audioTracks = useTracks(
    [Track.Source.Microphone, Track.Source.ScreenShareAudio],
    { onlySubscribed: true },
  );

  useEffect(() => {
    for (const participant of remoteParticipants) {
      const fromHost = participant.identity === hostId;
      const shouldSubscribe = fromHost || (isHost && memberMicEnabled);

      for (const publication of participant.trackPublications.values()) {
        if (publication.kind !== Track.Kind.Audio || !isAudioSource(publication.source)) continue;
        if (publication.isSubscribed !== shouldSubscribe) {
          publication.setSubscribed(shouldSubscribe);
        }
      }
    }
  }, [hostId, isHost, memberMicEnabled, remoteParticipants, room]);

  const audibleTracks = audioTracks.filter((trackRef) => {
    const fromHost = trackRef.participant.identity === hostId;
    if (fromHost) return true;
    return isHost && memberMicEnabled;
  });

  return (
    <>
      {audibleTracks.map((trackRef) => (
        <AudioTrack key={getTrackReferenceId(trackRef)} trackRef={trackRef} />
      ))}
    </>
  );
}
