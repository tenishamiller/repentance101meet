"use client";

import { useEffect } from "react";
import { AudioTrack, useRemoteParticipants, useRoomContext, useTracks } from "@livekit/components-react";
import { getTrackReferenceId } from "@livekit/components-core";
import { Track } from "livekit-client";

type Props = {
  hostId: string;
  /** When false, only the host's audio is subscribed for everyone. */
  memberMicEnabled: boolean;
};

function isAudioSource(source: Track.Source) {
  return (
    source === Track.Source.Microphone ||
    source === Track.Source.ScreenShareAudio
  );
}

/**
 * Livestream audio routing:
 * - Everyone always hears the host (camera + screen-share audio).
 * - When member mics are allowed, everyone also hears other members who are unmuted.
 * - When member mics are off by policy, member audio is not subscribed.
 */
export function LivestreamRoomAudio({ hostId, memberMicEnabled }: Props) {
  const room = useRoomContext();
  const remoteParticipants = useRemoteParticipants();
  const audioTracks = useTracks(
    [Track.Source.Microphone, Track.Source.ScreenShareAudio],
    { onlySubscribed: true },
  );

  useEffect(() => {
    for (const participant of remoteParticipants) {
      const fromHost = participant.identity === hostId;
      const shouldSubscribe = fromHost || memberMicEnabled;

      for (const publication of participant.trackPublications.values()) {
        if (publication.kind !== Track.Kind.Audio || !isAudioSource(publication.source)) continue;
        if (publication.isSubscribed !== shouldSubscribe) {
          publication.setSubscribed(shouldSubscribe);
        }
      }
    }
  }, [hostId, memberMicEnabled, remoteParticipants, room]);

  const audibleTracks = audioTracks.filter((trackRef) => {
    const fromHost = trackRef.participant.identity === hostId;
    if (fromHost) return true;
    return memberMicEnabled;
  });

  return (
    <>
      {audibleTracks.map((trackRef) => (
        <AudioTrack key={getTrackReferenceId(trackRef)} trackRef={trackRef} />
      ))}
    </>
  );
}
