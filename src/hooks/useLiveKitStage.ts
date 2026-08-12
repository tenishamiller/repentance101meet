"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useConnectionState,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, RoomEvent, Track } from "livekit-client";
import type { LocalTrackPublication, Participant, TrackPublication } from "livekit-client";
import type { TrackReference } from "@livekit/components-core";
import { listAudioInputDevices, listVideoInputDevices } from "@/lib/media-devices";
import {
  getMemberCameraPublishOptions,
  hostLivestreamCameraCapture,
  hostLivestreamCameraPublish,
  screenShareCaptureAttempts,
} from "@/lib/livekit-capture";
import { isLiveKitPermissionError } from "@/lib/livekit-errors";

function isMobileLiveKitClient() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function toTrackRef(
  participant: Participant | undefined,
  publication: TrackPublication | undefined,
  source: Track.Source,
): TrackReference | undefined {
  if (!participant || !publication) return undefined;
  return { participant, publication, source };
}

function pickTrack(refs: TrackReference[], source: Track.Source, identity?: string) {
  return refs.find(
    (ref) =>
      ref.source === source && (identity === undefined || ref.participant.identity === identity),
  );
}

type StageMode = "livestream" | "private";

type Options = {
  hostId: string;
  userId: string;
  isHost: boolean;
  memberVideoEnabled: boolean;
  memberMicEnabled: boolean;
  initialMemberCameraOn?: boolean;
  initialMemberMicOn?: boolean;
  mode?: StageMode;
};

export function useLiveKitStage({
  hostId,
  userId,
  isHost,
  memberVideoEnabled,
  memberMicEnabled,
  initialMemberCameraOn = false,
  initialMemberMicOn = false,
  mode = "livestream",
}: Options) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    cameraTrack: localCameraPublication,
    microphoneTrack: localMicPublication,
    lastCameraError,
    lastMicrophoneError,
  } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const [cameraOffByUser, setCameraOffByUser] = useState(false);
  const cameraOffByUserRef = useRef(false);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("");
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);

  const isLive = connectionState === ConnectionState.Connected;
  const isConnecting = connectionState === ConnectionState.Connecting;

  const publishedTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: false,
  });

  const localCameraFromRoom = useMemo(
    () => pickTrack(publishedTracks, Track.Source.Camera, localParticipant.identity),
    [localParticipant.identity, publishedTracks],
  );
  const localScreenFromRoom = useMemo(
    () => pickTrack(publishedTracks, Track.Source.ScreenShare, localParticipant.identity),
    [localParticipant.identity, publishedTracks],
  );
  const hostCameraFromRoom = useMemo(
    () => pickTrack(publishedTracks, Track.Source.Camera, hostId),
    [hostId, publishedTracks],
  );
  const hostScreenFromRoom = useMemo(
    () => pickTrack(publishedTracks, Track.Source.ScreenShare, hostId),
    [hostId, publishedTracks],
  );

  const localCameraTrack =
    localCameraFromRoom ??
    toTrackRef(localParticipant, localCameraPublication, Track.Source.Camera);
  const localScreenTrack =
    localScreenFromRoom ??
    toTrackRef(localParticipant, localParticipant.getTrackPublication(Track.Source.ScreenShare), Track.Source.ScreenShare);

  const hostParticipant = remoteParticipants.find((p) => p.identity === hostId);
  const privatePeer = remoteParticipants.find((p) => p.identity !== userId);
  const privatePeerCameraTrack = useMemo(
    () =>
      privatePeer
        ? pickTrack(publishedTracks, Track.Source.Camera, privatePeer.identity)
        : undefined,
    [privatePeer, publishedTracks],
  );

  const hasLocalScreenTrack = !!localScreenTrack?.publication?.track;
  const isScreenSharing =
    isHost && mode === "livestream" && isScreenShareEnabled && hasLocalScreenTrack;
  const isRemoteScreenSharing =
    mode === "livestream" &&
    !isHost &&
    !!hostScreenFromRoom?.publication?.track;

  const hostMainTrack =
    mode === "private"
      ? privatePeerCameraTrack
      : isHost
        ? isScreenSharing
          ? localScreenTrack
          : localCameraTrack
        : isRemoteScreenSharing
          ? hostScreenFromRoom
          : hostCameraFromRoom;

  const hostCameraPipTrack =
    mode === "private"
      ? undefined
      : isHost
        ? isScreenSharing
          ? localCameraTrack
          : undefined
        : isRemoteScreenSharing
          ? hostCameraFromRoom
          : undefined;

  const canUseMic =
    isHost || mode === "private" || (mode === "livestream" && memberMicEnabled);
  const canUseCamera =
    isHost || mode === "private" || (mode === "livestream" && memberVideoEnabled);

  const isMuted = !isMicrophoneEnabled || !canUseMic;
  const isCameraOff =
    cameraOffByUser ||
    !canUseCamera ||
    (!isCameraEnabled && !localCameraPublication?.track);

  const remoteParticipant = mode === "private" ? privatePeer : hostParticipant;
  const isRemoteMuted = remoteParticipant ? !remoteParticipant.isMicrophoneEnabled : false;

  const hasHostVideoTrack =
    !!hostMainTrack?.publication?.track ||
    !!hostScreenFromRoom?.publication?.track ||
    !!hostCameraFromRoom?.publication?.track;

  const isRemoteCameraOff =
    mode === "private"
      ? !!privatePeer && !privatePeer.isCameraEnabled && !privatePeerCameraTrack?.publication?.track
      : !isHost &&
        !!hostParticipant &&
        !hostParticipant.isCameraEnabled &&
        !isRemoteScreenSharing &&
        !hasHostVideoTrack;

  const waitingForHostVideo =
    isLive && !isHost && !hasHostVideoTrack && !isRemoteCameraOff && !isRemoteScreenSharing;

  const hasLocalVideoTrack = !!localCameraTrack?.publication?.track;
  const waitingForSelfVideo =
    isLive &&
    !isHost &&
    mode === "livestream" &&
    memberVideoEnabled &&
    initialMemberCameraOn &&
    !cameraOffByUser &&
    !hasLocalVideoTrack;

  const remoteMemberParticipants = useMemo(
    () => remoteParticipants.filter((p) => p.identity !== hostId && p.identity !== userId),
    [hostId, remoteParticipants, userId],
  );

  const mediaError = (() => {
    const message = lastCameraError?.message || lastMicrophoneError?.message || "";
    return isLiveKitPermissionError(message) ? "" : message;
  })();

  const enableHostCamera = useCallback(async (enabled: boolean) => {
    if (enabled) {
      await localParticipant.setCameraEnabled(
        true,
        hostLivestreamCameraCapture,
        hostLivestreamCameraPublish,
      );
      return;
    }
    await localParticipant.setCameraEnabled(false);
  }, [localParticipant]);

  const enableMemberCamera = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const { capture, publish } = getMemberCameraPublishOptions(isRemoteScreenSharing);
        await localParticipant.setCameraEnabled(true, capture, publish);
        return;
      }
      await localParticipant.setCameraEnabled(false);
      if (isMobileLiveKitClient()) {
        const publication = localParticipant.getTrackPublication(Track.Source.Camera);
        if (publication?.track) {
          publication.track.stop();
        }
      }
    },
    [isRemoteScreenSharing, localParticipant],
  );

  useEffect(() => {
    cameraOffByUserRef.current = cameraOffByUser;
  }, [cameraOffByUser]);

  useEffect(() => {
    if (isHost || mode !== "livestream") return;
    if (!memberMicEnabled) {
      void localParticipant.setMicrophoneEnabled(false);
    }
  }, [isHost, localParticipant, memberMicEnabled, mode]);

  useEffect(() => {
    if (isHost || mode !== "livestream") return;
    if (!memberVideoEnabled) {
      cameraOffByUserRef.current = true;
      setCameraOffByUser(true);
      void enableMemberCamera(false);
    }
  }, [enableMemberCamera, isHost, memberVideoEnabled, mode]);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;

    void (async () => {
      try {
        if (isHost || mode === "private") {
          if (isHost && mode === "livestream") {
            await enableHostCamera(true);
          } else {
            await localParticipant.setCameraEnabled(true);
          }
          await localParticipant.setMicrophoneEnabled(true);
          cameraOffByUserRef.current = false;
          setCameraOffByUser(false);
          return;
        }

        if (memberVideoEnabled && initialMemberCameraOn) {
          await enableMemberCamera(true);
          cameraOffByUserRef.current = false;
          setCameraOffByUser(false);
        } else {
          cameraOffByUserRef.current = true;
          setCameraOffByUser(true);
          await enableMemberCamera(false);
        }

        if (memberMicEnabled && initialMemberMicOn) {
          await localParticipant.setMicrophoneEnabled(true);
        } else {
          await localParticipant.setMicrophoneEnabled(false);
        }
      } catch {
        /* surfaced via lastCameraError */
      }
    })();
  }, [
    connectionState,
    enableHostCamera,
    enableMemberCamera,
    initialMemberCameraOn,
    initialMemberMicOn,
    isHost,
    localParticipant,
    memberMicEnabled,
    memberVideoEnabled,
    mode,
  ]);

  useEffect(() => {
    if (isHost || mode !== "livestream" || connectionState !== ConnectionState.Connected) return;
    if (!memberVideoEnabled || cameraOffByUserRef.current) {
      void enableMemberCamera(false);
      return;
    }
    void enableMemberCamera(true);
  }, [
    connectionState,
    enableMemberCamera,
    isHost,
    isRemoteScreenSharing,
    memberVideoEnabled,
    mode,
  ]);

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

  /** Restore host camera on the main stage as soon as screen share ends. */
  useEffect(() => {
    if (!isHost || mode !== "livestream" || connectionState !== ConnectionState.Connected) return;
    if (isScreenSharing || cameraOffByUser) return;
    void enableHostCamera(true);
  }, [
    cameraOffByUser,
    connectionState,
    enableHostCamera,
    isHost,
    isScreenSharing,
    mode,
  ]);

  useEffect(() => {
    if (!isHost || mode !== "livestream") return;

    const onLocalTrackUnpublished = (publication: LocalTrackPublication) => {
      if (publication.source !== Track.Source.ScreenShare || cameraOffByUser) return;
      void enableHostCamera(true);
    };

    room.on(RoomEvent.LocalTrackUnpublished, onLocalTrackUnpublished);
    return () => {
      room.off(RoomEvent.LocalTrackUnpublished, onLocalTrackUnpublished);
    };
  }, [cameraOffByUser, enableHostCamera, isHost, mode, room]);

  const toggleMute = useCallback(async () => {
    if (!canUseMic || (!isHost && mode === "livestream" && !memberMicEnabled)) return;
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }, [canUseMic, isHost, isMicrophoneEnabled, localParticipant, memberMicEnabled, mode]);

  const toggleCamera = useCallback(async () => {
    if (!canUseCamera) return;
    if (!isHost && mode === "livestream" && !memberVideoEnabled) return;
    const nextOff = !cameraOffByUserRef.current;
    cameraOffByUserRef.current = nextOff;
    setCameraOffByUser(nextOff);
    if (!isHost && mode === "livestream") {
      await enableMemberCamera(!nextOff);
      return;
    }
    if (isHost && mode === "livestream") {
      await enableHostCamera(!nextOff);
      return;
    }
    await localParticipant.setCameraEnabled(!nextOff);
  }, [
    canUseCamera,
    enableHostCamera,
    enableMemberCamera,
    isHost,
    localParticipant,
    memberVideoEnabled,
    mode,
  ]);

  const toggleScreenShare = useCallback(async () => {
    if (!isHost) return;
    if (isScreenShareEnabled) {
      await localParticipant.setScreenShareEnabled(false);
      if (!cameraOffByUser && mode === "livestream") {
        await enableHostCamera(true);
      }
      return;
    }

    const publishOptions = { degradationPreference: "maintain-resolution" as const };

    for (const options of screenShareCaptureAttempts) {
      try {
        await localParticipant.setScreenShareEnabled(true, options, publishOptions);
        return;
      } catch {
        /* try the next capture profile */
      }
    }

    await localParticipant.setScreenShareEnabled(true, undefined, publishOptions);
  }, [cameraOffByUser, enableHostCamera, isHost, isScreenShareEnabled, localParticipant, mode]);

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
    mediaError,
    waitingForHostVideo,
    waitingForSelfVideo,
  };
}
