"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useConnectionState,
  useLocalParticipant,
  useParticipantTracks,
  useRemoteParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import type { TrackReference } from "@livekit/components-core";
import { listAudioInputDevices, listVideoInputDevices } from "@/lib/media-devices";

function pickTrack(refs: TrackReference[], source: Track.Source) {
  return refs.find((ref) => ref.source === source);
}

type StageMode = "livestream" | "private";

type Options = {
  hostId: string;
  userId: string;
  isHost: boolean;
  memberVideoEnabled: boolean;
  memberMicEnabled: boolean;
  mode?: StageMode;
};

export function useLiveKitStage({
  hostId,
  userId,
  isHost,
  memberVideoEnabled,
  memberMicEnabled,
  mode = "livestream",
}: Options) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const [cameraOffByUser, setCameraOffByUser] = useState(false);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("");
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);

  const isLive = connectionState === ConnectionState.Connected;
  const isConnecting = connectionState === ConnectionState.Connecting;

  const localCameraTracks = useParticipantTracks([Track.Source.Camera], {
    participantIdentity: localParticipant.identity,
  });
  const localScreenTracks = useParticipantTracks([Track.Source.ScreenShare], {
    participantIdentity: localParticipant.identity,
  });
  const hostCameraTracks = useParticipantTracks([Track.Source.Camera], {
    participantIdentity: hostId,
  });
  const hostScreenTracks = useParticipantTracks([Track.Source.ScreenShare], {
    participantIdentity: hostId,
  });

  const hostParticipant = remoteParticipants.find((p) => p.identity === hostId);
  const privatePeer = remoteParticipants.find((p) => p.identity !== userId);
  const privatePeerCameraTracks = useParticipantTracks([Track.Source.Camera], {
    participantIdentity: privatePeer?.identity ?? "",
  });
  const privatePeerCameraTrack = pickTrack(privatePeerCameraTracks, Track.Source.Camera);

  const isScreenSharing = isHost && mode === "livestream" && isScreenShareEnabled;
  const isRemoteScreenSharing =
    mode === "livestream" &&
    !isHost &&
    !!pickTrack(hostScreenTracks, Track.Source.ScreenShare)?.publication?.track;

  const hostMainTrack =
    mode === "private"
      ? privatePeerCameraTrack
      : isHost
        ? isScreenShareEnabled
          ? pickTrack(localScreenTracks, Track.Source.ScreenShare)
          : pickTrack(localCameraTracks, Track.Source.Camera)
        : isRemoteScreenSharing
          ? pickTrack(hostScreenTracks, Track.Source.ScreenShare)
          : pickTrack(hostCameraTracks, Track.Source.Camera);

  const hostCameraPipTrack =
    mode === "private"
      ? undefined
      : isHost
        ? isScreenShareEnabled
          ? pickTrack(localCameraTracks, Track.Source.Camera)
          : undefined
        : isRemoteScreenSharing
          ? pickTrack(hostCameraTracks, Track.Source.Camera)
          : undefined;

  const localCameraTrack = pickTrack(localCameraTracks, Track.Source.Camera);

  const canUseMic = isHost || memberMicEnabled || mode === "private";
  const canUseCamera = isHost || memberVideoEnabled || mode === "private";

  const isMuted = !isMicrophoneEnabled || !canUseMic;
  const isCameraOff = !isCameraEnabled || cameraOffByUser || !canUseCamera;

  const remoteParticipant = mode === "private" ? privatePeer : hostParticipant;
  const isRemoteMuted = remoteParticipant ? !remoteParticipant.isMicrophoneEnabled : false;
  const isRemoteCameraOff =
    mode === "private"
      ? !privatePeerCameraTrack?.publication?.track || !privatePeer?.isCameraEnabled
      : !isHost &&
        !pickTrack(hostCameraTracks, Track.Source.Camera)?.publication?.track &&
        !isRemoteScreenSharing;

  const remoteMemberParticipants = useMemo(
    () => remoteParticipants.filter((p) => p.identity !== hostId && p.identity !== userId),
    [hostId, remoteParticipants, userId],
  );

  useEffect(() => {
    if (isHost) return;
    if (!memberMicEnabled) {
      void localParticipant.setMicrophoneEnabled(false);
    }
  }, [isHost, localParticipant, memberMicEnabled]);

  useEffect(() => {
    if (isHost) return;
    if (!memberVideoEnabled) {
      void localParticipant.setCameraEnabled(false);
    }
  }, [isHost, localParticipant, memberVideoEnabled]);

  const refreshMediaInputDevices = useCallback(async () => {
    setIsRefreshingDevices(true);
    try {
      const [videoDevices, audioDevices] = await Promise.all([
        listVideoInputDevices(),
        listAudioInputDevices(),
      ]);
      setVideoInputDevices(videoDevices);
      setAudioInputDevices(audioDevices);
    } finally {
      setIsRefreshingDevices(false);
    }
  }, []);

  useEffect(() => {
    void refreshMediaInputDevices();
  }, [refreshMediaInputDevices]);

  useEffect(() => {
    if (!isHost && mode !== "private") return;
    if (connectionState !== ConnectionState.Connected) return;
    void localParticipant.setCameraEnabled(true);
    void localParticipant.setMicrophoneEnabled(true);
    setCameraOffByUser(false);
  }, [connectionState, isHost, localParticipant, mode]);

  const toggleMute = useCallback(async () => {
    if (!canUseMic) return;
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }, [canUseMic, isMicrophoneEnabled, localParticipant]);

  const toggleCamera = useCallback(async () => {
    if (!canUseCamera) return;
    const nextOff = !cameraOffByUser;
    setCameraOffByUser(nextOff);
    await localParticipant.setCameraEnabled(!nextOff);
  }, [cameraOffByUser, canUseCamera, localParticipant]);

  const toggleScreenShare = useCallback(async () => {
    if (!isHost) return;
    await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
  }, [isHost, isScreenShareEnabled, localParticipant]);

  const switchVideoDevice = useCallback(
    async (deviceId: string) => {
      if (!deviceId) return;
      setSelectedVideoDeviceId(deviceId);
      await room.switchActiveDevice("videoinput", deviceId);
    },
    [room],
  );

  const switchAudioDevice = useCallback(
    async (deviceId: string) => {
      if (!deviceId) return;
      setSelectedAudioDeviceId(deviceId);
      await room.switchActiveDevice("audioinput", deviceId);
    },
    [room],
  );

  const switchFacingMode = useCallback(async () => {
    const devices = await listVideoInputDevices();
    const current = devices.find((d) => d.deviceId === selectedVideoDeviceId);
    const label = current?.label.toLowerCase() ?? "";
    const next = devices.find((d) =>
      label.includes("front") || label.includes("user")
        ? d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment")
        : d.label.toLowerCase().includes("front") || d.label.toLowerCase().includes("user"),
    );
    if (next) await switchVideoDevice(next.deviceId);
  }, [selectedVideoDeviceId, switchVideoDevice]);

  return {
    isLive,
    isConnecting,
    isMuted,
    isCameraOff,
    isRemoteMuted,
    isRemoteCameraOff,
    isRemoteScreenSharing,
    isScreenSharing,
    hostMainTrack,
    hostCameraPipTrack,
    localCameraTrack,
    remoteParticipants,
    remoteMemberParticipants,
    videoInputDevices,
    audioInputDevices,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    switchVideoDevice,
    switchAudioDevice,
    switchFacingMode,
    refreshMediaInputDevices,
    isRefreshingDevices,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  };
}
