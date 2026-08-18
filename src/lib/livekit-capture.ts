import {
  ScreenSharePresets,
  VideoPresets,
  type RoomOptions,
  type ScreenShareCaptureOptions,
  type TrackPublishOptions,
  type VideoCaptureOptions,
} from "livekit-client";

function isMobileLiveKitClient() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/** Retina-aware layer selection for viewers — does not increase host uplink. */
function getAdaptiveStreamPixelDensity() {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

function getScreenSharePreset() {
  return isMobileLiveKitClient()
    ? ScreenSharePresets.h720fps15
    : ScreenSharePresets.h1080fps15;
}

/**
 * Screen capture for livestream host.
 * Do not set systemAudio: "include" — it breaks window sharing in Chrome (tabs still work).
 * Tab audio uses audio: true plus the browser's "Share tab audio" checkbox.
 */
export function getScreenShareCaptureAttempts(): ScreenShareCaptureOptions[] {
  const resolution = getScreenSharePreset().resolution;

  return [
    {
      audio: true,
      resolution,
      contentHint: "detail",
      surfaceSwitching: "include",
    },
    {
      audio: false,
      resolution,
      contentHint: "detail",
    },
    { audio: false },
  ];
}

/** H.264 screen share — sharper text, less CPU than VP8, no simulcast overhead. */
export function getHostScreenSharePublish(): TrackPublishOptions {
  const preset = getScreenSharePreset();

  return {
    videoCodec: "h264",
    backupCodec: {
      codec: "vp8",
      encoding: preset.encoding,
    },
    degradationPreference: isMobileLiveKitClient()
      ? "maintain-framerate"
      : "maintain-resolution",
    simulcast: false,
    screenShareEncoding: {
      ...preset.encoding,
    },
  };
}

/**
 * LiveKit room defaults. When `persistInBackground` is true (livestream), the room
 * stays connected while the tab is hidden and mobile clients use HTML audio playback
 * so listeners can keep hearing the host after switching apps.
 */
export function getLiveKitRoomOptions(persistInBackground = false): RoomOptions {
  const mobileClient = isMobileLiveKitClient();
  const screenSharePreset = getScreenSharePreset();

  return {
    adaptiveStream: {
      pixelDensity: getAdaptiveStreamPixelDensity(),
      // Keep video alive when listeners background the tab during livestream.
      pauseVideoInBackground: !persistInBackground,
    },
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
      screenShareEncoding: {
        ...screenSharePreset.encoding,
      },
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

/** Host PiP camera while screen sharing — frees uplink for 1080p presentation. */
export const hostPresentingCameraCapture: VideoCaptureOptions = {
  resolution: VideoPresets.h360.resolution,
  frameRate: 15,
};

export const hostPresentingCameraPublish: TrackPublishOptions = {
  videoCodec: "h264",
  videoEncoding: VideoPresets.h360.encoding,
  degradationPreference: "maintain-framerate",
  simulcast: false,
};

/** Member camera when the host is presenting — same profile as normal so share toggles do not republish. */
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

export function getMemberCameraPublishOptions() {
  return {
    capture: memberLivestreamCameraCapture,
    publish: memberLivestreamCameraPublish,
  };
}
