import type { TrackReference } from "@livekit/components-core";
import {
  RemoteTrackPublication,
  Track,
  VideoQuality,
  type TrackPublication,
} from "livekit-client";

/** Main-stage remote camera: highest simulcast layer + minimal browser buffering. */
export function applyMainStageLowLatency(publication?: TrackPublication) {
  if (!(publication instanceof RemoteTrackPublication)) return;
  if (publication.source !== Track.Source.Camera) return;

  publication.setVideoQuality(VideoQuality.HIGH);

  const track = publication.track;
  if (track && !track.isLocal) {
    track.setPlayoutDelay(0);
  }
}

/** Sidebar / panel tiles — lowest simulcast layer to save host bandwidth at scale. */
export function applyPanelRemoteVideo(publication?: TrackPublication) {
  if (!(publication instanceof RemoteTrackPublication)) return;
  if (publication.source !== Track.Source.Camera) return;

  publication.setVideoQuality(VideoQuality.LOW);
}

/** @deprecated Use applyMainStageLowLatency — only for main-stage tiles with lowLatency prop. */
export function applyLowLatencyRemoteVideoPublication(publication?: TrackPublication) {
  applyMainStageLowLatency(publication);
}

/** @deprecated Prefer applyMainStageLowLatency — kept for tile-level hooks. */
export function applyLowLatencyRemoteVideo(trackRef?: TrackReference) {
  applyMainStageLowLatency(trackRef?.publication);
}
