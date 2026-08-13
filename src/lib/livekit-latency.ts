import type { TrackReference } from "@livekit/components-core";
import {
  RemoteTrackPublication,
  Track,
  VideoQuality,
  type TrackPublication,
} from "livekit-client";

const MAIN_STAGE_SOURCES = new Set<Track.Source>([
  Track.Source.Camera,
  Track.Source.ScreenShare,
]);

function asMainStageRemote(
  publication?: TrackPublication,
): RemoteTrackPublication | undefined {
  if (!(publication instanceof RemoteTrackPublication)) return undefined;
  if (!MAIN_STAGE_SOURCES.has(publication.source)) return undefined;
  return publication;
}

/** Main-stage remote video (host camera or screen share): high quality + minimal buffering. */
export function applyMainStageLowLatency(publication?: TrackPublication) {
  const remote = asMainStageRemote(publication);
  if (!remote) return;

  remote.setVideoQuality(VideoQuality.HIGH);

  const track = remote.track;
  if (track && !track.isLocal && "setPlayoutDelay" in track) {
    (track as { setPlayoutDelay: (seconds: number) => void }).setPlayoutDelay(0);
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
