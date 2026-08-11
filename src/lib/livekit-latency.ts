import type { TrackReference } from "@livekit/components-core";
import {
  RemoteTrackPublication,
  Track,
  VideoQuality,
  type TrackPublication,
} from "livekit-client";

/** Prefer the highest simulcast layer and minimal browser buffering for remote camera video. */
export function applyLowLatencyRemoteVideoPublication(publication?: TrackPublication) {
  if (!(publication instanceof RemoteTrackPublication)) return;
  if (publication.source !== Track.Source.Camera) return;

  publication.setVideoQuality(VideoQuality.HIGH);

  const track = publication.track;
  if (track && !track.isLocal) {
    track.setPlayoutDelay(0);
  }
}

/** @deprecated Prefer applyLowLatencyRemoteVideoPublication — kept for tile-level hooks. */
export function applyLowLatencyRemoteVideo(trackRef?: TrackReference) {
  applyLowLatencyRemoteVideoPublication(trackRef?.publication);
}
