"use client";

import { useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, Track, type RemoteParticipant, type RemoteTrackPublication } from "livekit-client";
import { applyLowLatencyRemoteVideoPublication } from "@/lib/livekit-latency";

function tuneParticipantCameras(participant: RemoteParticipant) {
  for (const publication of participant.trackPublications.values()) {
    applyLowLatencyRemoteVideoPublication(publication);
  }
}

/** Keep remote camera feeds on the highest layer with minimal playback buffering. */
export function LiveKitRemoteVideoTuning() {
  const room = useRoomContext();

  useEffect(() => {
    const onTrackSubscribed = (
      track: { kind: Track.Kind },
      publication: RemoteTrackPublication,
    ) => {
      if (track.kind !== Track.Kind.Video) return;
      applyLowLatencyRemoteVideoPublication(publication);
    };

    for (const participant of room.remoteParticipants.values()) {
      tuneParticipantCameras(participant);
    }

    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.ParticipantConnected, tuneParticipantCameras);

    return () => {
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      room.off(RoomEvent.ParticipantConnected, tuneParticipantCameras);
    };
  }, [room]);

  return null;
}
