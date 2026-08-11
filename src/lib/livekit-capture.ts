import {
  ScreenSharePresets,
  VideoPresets,
  type RoomOptions,
  type ScreenShareCaptureOptions,
  type TrackPublishOptions,
  type VideoCaptureOptions,
} from "livekit-client";

const screenShareResolution = ScreenSharePresets.h720fps15.resolution;

/**
 * Screen capture for livestream host.
 * Do not set systemAudio: "include" — it breaks window sharing in Chrome (tabs still work).
 * Tab audio uses audio: true plus the browser's "Share tab audio" checkbox.
 */
export const screenShareCaptureOptions: ScreenShareCaptureOptions = {
  audio: true,
  resolution: screenShareResolution,
  contentHint: "detail",
  surfaceSwitching: "include",
};

/** Fallback when the browser rejects audio in getDisplayMedia (still shares window/tab video). */
export const screenShareVideoOnlyOptions: ScreenShareCaptureOptions = {
  audio: false,
  resolution: screenShareResolution,
  contentHint: "detail",
};

/** Ordered attempts — stop at the first successful publish. */
export const screenShareCaptureAttempts: ScreenShareCaptureOptions[] = [
  screenShareCaptureOptions,
  screenShareVideoOnlyOptions,
  { audio: false },
];

function isMobileLiveKitClient() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * LiveKit room defaults. When `persistInBackground` is true (livestream), the room
 * stays connected while the tab is hidden and mobile clients use HTML audio playback
 * so listeners can keep hearing the host after switching apps.
 */
export function getLiveKitRoomOptions(persistInBackground = false): RoomOptions {
  const mobileClient = isMobileLiveKitClient();

  return {
    adaptiveStream: { pixelDensity: 1, pauseVideoInBackground: true },
    dynacast: true,
    // WebAudio is suspended in background on iOS; HTML audio elements keep playing.
    webAudioMix: mobileClient ? false : true,
    disconnectOnPageLeave: !persistInBackground,
    videoCaptureDefaults: {
      resolution: VideoPresets.h360.resolution,
      frameRate: 30,
    },
    publishDefaults: {
      simulcast: true,
      backupCodec: false,
      videoCodec: "vp8",
      degradationPreference: "maintain-framerate",
      screenShareEncoding: ScreenSharePresets.h720fps15.encoding,
      videoSimulcastLayers: [VideoPresets.h180],
    },
  };
}

/** Host camera — 720p24 for sharper teaching video; H.264 primary with VP8 fallback. */
export const hostLivestreamCameraCapture: VideoCaptureOptions = {
  resolution: VideoPresets.h720.resolution,
  frameRate: 24,
};

export const hostLivestreamCameraPublish: TrackPublishOptions = {
  videoCodec: "h264",
  backupCodec: {
    codec: "vp8",
    encoding: {
      maxBitrate: 1_350_000,
      maxFramerate: 24,
    },
  },
  videoEncoding: {
    maxBitrate: 1_350_000,
    maxFramerate: 24,
  },
  degradationPreference: "maintain-framerate",
  simulcast: true,
  videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h360, VideoPresets.h180],
};

/** Member camera when host is not presenting (pip / split layout). */
export const memberLivestreamCameraCapture: VideoCaptureOptions = {
  resolution: VideoPresets.h360.resolution,
  frameRate: 24,
};

export const memberLivestreamCameraPublish: TrackPublishOptions = {
  videoEncoding: {
    maxBitrate: 350_000,
    maxFramerate: 24,
  },
  degradationPreference: "maintain-framerate",
  simulcast: true,
  videoSimulcastLayers: [VideoPresets.h180],
};

/** Sidebar tiles while host screen share is primary — still 360p for smoother motion. */
export const memberPresentingCameraCapture: VideoCaptureOptions = {
  resolution: VideoPresets.h360.resolution,
  frameRate: 24,
};

export const memberPresentingCameraPublish: TrackPublishOptions = {
  videoEncoding: VideoPresets.h360.encoding,
  degradationPreference: "maintain-framerate",
  simulcast: false,
};

export function getMemberCameraPublishOptions(isRemoteScreenSharing: boolean) {
  return isRemoteScreenSharing
    ? {
        capture: memberPresentingCameraCapture,
        publish: memberPresentingCameraPublish,
      }
    : {
        capture: memberLivestreamCameraCapture,
        publish: memberLivestreamCameraPublish,
      };
}
