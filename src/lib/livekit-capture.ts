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
  publishDefaults: {
    simulcast: true,
    degradationPreference: "maintain-framerate",
    screenShareEncoding: ScreenSharePresets.h720fps15.encoding,
    videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
  },
};

/** Host camera — balanced quality with faster encode/decode than full 720p30. */
export const hostLivestreamCameraCapture: VideoCaptureOptions = {
  resolution: VideoPresets.h540.resolution,
  frameRate: 24,
};

export const hostLivestreamCameraPublish: TrackPublishOptions = {
  videoEncoding: VideoPresets.h540.encoding,
  degradationPreference: "maintain-framerate",
  simulcast: true,
  videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
};

/** Member camera when host is not presenting (pip / split layout). */
export const memberLivestreamCameraCapture: VideoCaptureOptions = {
  resolution: VideoPresets.h360.resolution,
  frameRate: 24,
};

export const memberLivestreamCameraPublish: TrackPublishOptions = {
  videoEncoding: VideoPresets.h360.encoding,
  degradationPreference: "maintain-framerate",
  simulcast: true,
  videoSimulcastLayers: [VideoPresets.h180],
};

/** Lower bandwidth while host screen share is primary — smoother motion in small tiles. */
export const memberPresentingCameraCapture: VideoCaptureOptions = {
  resolution: VideoPresets.h180.resolution,
  frameRate: 20,
};

export const memberPresentingCameraPublish: TrackPublishOptions = {
  videoEncoding: VideoPresets.h180.encoding,
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
