import {
  ScreenSharePresets,
  VideoPresets,
  type RoomOptions,
  type ScreenShareCaptureOptions,
  type TrackPublishOptions,
  type VideoCaptureOptions,
} from "livekit-client";

/** Request tab/window audio when sharing screen (Chrome: check "Share tab audio"). */
export const screenShareCaptureOptions: ScreenShareCaptureOptions = {
  audio: true,
  systemAudio: "include",
  resolution: ScreenSharePresets.h720fps15.resolution,
};

/** Room-wide streaming defaults — adaptive layers for sidebar tiles during screen share. */
export const liveKitRoomOptions: RoomOptions = {
  adaptiveStream: { pixelDensity: 1, pauseVideoInBackground: false },
  dynacast: true,
  webAudioMix: true,
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
  frameRate: 30,
};

export const memberLivestreamCameraPublish: TrackPublishOptions = {
  videoEncoding: {
    maxBitrate: 450_000,
    maxFramerate: 30,
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
