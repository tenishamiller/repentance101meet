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

/** Host camera — 360p30 for faster encode/decode and smoother motion than 540p24. */
export const hostLivestreamCameraCapture: VideoCaptureOptions = {
  resolution: VideoPresets.h360.resolution,
  frameRate: 30,
};

export const hostLivestreamCameraPublish: TrackPublishOptions = {
  videoEncoding: {
    maxBitrate: 600_000,
    maxFramerate: 30,
  },
  degradationPreference: "maintain-framerate",
  simulcast: true,
  videoSimulcastLayers: [VideoPresets.h180],
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
