import type { TrackReference } from "@livekit/components-core";
import { RemoteTrackPublication, VideoQuality } from "livekit-client";

/** Prefer the highest simulcast layer and minimal browser buffering for remote video. */
export function applyLowLatencyRemoteVideo(trackRef?: TrackReference) {
  const publication = trackRef?.publication;
  if (!(publication instanceof RemoteTrackPublication)) return;

  publication.setVideoQuality(VideoQuality.HIGH);

  const track = publication.track;
  if (track && !track.isLocal) {
    track.setPlayoutDelay(0);
  }
}
