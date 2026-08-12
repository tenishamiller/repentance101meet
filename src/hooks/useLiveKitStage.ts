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
import {
  listAudioInputDevices,
  listVideoInputDevices,
  loadPreferredAudioDeviceId,
  loadPreferredCameraDeviceId,
  savePreferredAudioDeviceId,
  savePreferredCameraDeviceId,
} from "@/lib/media-devices";
import {
  getMemberCameraPublishOptions,
  hostLivestreamCameraCapture,
  hostLivestreamCameraPublish,
  screenShareCaptureAttempts,
} from "@/lib/livekit-capture";
import { isLiveKitPermissionError } from "@/lib/livekit-errors";

function withExactDeviceId<T extends { deviceId?: ConstrainDOMString }>(
  options: T,
  deviceId: string,
): T {
  if (!deviceId) return options;
  return { ...options, deviceId: { exact: deviceId } };
}

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
  /** Current chosen device — hot-plug must not override this. */
  const preferredVideoDeviceIdRef = useRef("");
  const preferredAudioDeviceIdRef = useRef("");
  /** Device in use when the session started (fallback when preferred is unplugged). */
  const sessionVideoDeviceIdRef = useRef("");
  const sessionAudioDeviceIdRef = useRef("");
  const reconcilingDevicesRef = useRef(false);

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

  const enableHostCamera = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        await localParticipant.setCameraEnabled(
          true,
          withExactDeviceId(
            hostLivestreamCameraCapture,
            preferredVideoDeviceIdRef.current,
          ),
          hostLivestreamCameraPublish,
        );
        return;
      }
      await localParticipant.setCameraEnabled(false);
    },
    [localParticipant],
  );

  const enableMemberCamera = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const { capture, publish } = getMemberCameraPublishOptions(isRemoteScreenSharing);
        await localParticipant.setCameraEnabled(
          true,
          withExactDeviceId(capture, preferredVideoDeviceIdRef.current),
          publish,
        );
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

  const enableMicrophone = useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        await localParticipant.setMicrophoneEnabled(false);
        return;
      }
      const deviceId = preferredAudioDeviceIdRef.current;
      await localParticipant.setMicrophoneEnabled(
        true,
        deviceId ? { deviceId: { exact: deviceId } } : undefined,
      );
    },
    [localParticipant],
  );

  useEffect(() => {
    cameraOffByUserRef.current = cameraOffByUser;
  }, [cameraOffByUser]);

  useEffect(() => {
    if (isHost || mode !== "livestream") return;
    if (!memberMicEnabled) {
      void enableMicrophone(false);
    }
  }, [enableMicrophone, isHost, memberMicEnabled, mode]);

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
            await localParticipant.setCameraEnabled(
              true,
              withExactDeviceId({}, preferredVideoDeviceIdRef.current),
            );
          }
          await enableMicrophone(true);
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
          await enableMicrophone(true);
        } else {
          await enableMicrophone(false);
        }
      } catch {
        /* surfaced via lastCameraError */
      }
    })();
  }, [
    connectionState,
    enableHostCamera,
    enableMemberCamera,
    enableMicrophone,
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

  const pickFallbackDeviceId = useCallback(
    (devices: MediaDeviceInfo[], preferred: string, session: string) => {
      if (preferred && devices.some((device) => device.deviceId === preferred)) {
        return preferred;
      }
      if (session && devices.some((device) => device.deviceId === session)) {
        return session;
      }
      return devices[0]?.deviceId ?? "";
    },
    [],
  );

  const ensureKindDevice = useCallback(
    async (kind: "videoinput" | "audioinput", deviceId: string) => {
      if (!deviceId) return;
      if (room.getActiveDevice(kind) === deviceId) return;
      try {
        await room.switchActiveDevice(kind, deviceId);
      } catch {
        /* device may have disappeared mid-switch */
      }
    },
    [room],
  );

  const initializePreferredDevices = useCallback(
    (videoDevices: MediaDeviceInfo[], audioDevices: MediaDeviceInfo[]) => {
      const activeVideo = room.getActiveDevice("videoinput") ?? "";
      const activeAudio = room.getActiveDevice("audioinput") ?? "";

      if (!preferredVideoDeviceIdRef.current) {
        const stored = loadPreferredCameraDeviceId();
        const nextVideo =
          (stored && videoDevices.some((device) => device.deviceId === stored) && stored) ||
          (activeVideo && videoDevices.some((device) => device.deviceId === activeVideo) && activeVideo) ||
          videoDevices[0]?.deviceId ||
          "";
        preferredVideoDeviceIdRef.current = nextVideo;
        sessionVideoDeviceIdRef.current = nextVideo;
        setSelectedVideoDeviceId(nextVideo);
      }

      if (!preferredAudioDeviceIdRef.current) {
        const stored = loadPreferredAudioDeviceId();
        const nextAudio =
          (stored && audioDevices.some((device) => device.deviceId === stored) && stored) ||
          (activeAudio && audioDevices.some((device) => device.deviceId === activeAudio) && activeAudio) ||
          audioDevices[0]?.deviceId ||
          "";
        preferredAudioDeviceIdRef.current = nextAudio;
        sessionAudioDeviceIdRef.current = nextAudio;
        setSelectedAudioDeviceId(nextAudio);
      }
    },
    [room],
  );

  const reconcileMediaDevices = useCallback(async () => {
    if (reconcilingDevicesRef.current) return;
    reconcilingDevicesRef.current = true;
    try {
      const [videoDevices, audioDevices] = await Promise.all([
        listVideoInputDevices(),
        listAudioInputDevices(),
      ]);
      setVideoInputDevices(videoDevices);
      setAudioInputDevices(audioDevices);
      initializePreferredDevices(videoDevices, audioDevices);

      const nextVideo = pickFallbackDeviceId(
        videoDevices,
        preferredVideoDeviceIdRef.current,
        sessionVideoDeviceIdRef.current,
      );
      const nextAudio = pickFallbackDeviceId(
        audioDevices,
        preferredAudioDeviceIdRef.current,
        sessionAudioDeviceIdRef.current,
      );

      if (nextVideo) {
        const preferredLost =
          !!preferredVideoDeviceIdRef.current &&
          !videoDevices.some((device) => device.deviceId === preferredVideoDeviceIdRef.current);
        preferredVideoDeviceIdRef.current = nextVideo;
        if (preferredLost || !sessionVideoDeviceIdRef.current) {
          sessionVideoDeviceIdRef.current = nextVideo;
        }
        setSelectedVideoDeviceId(nextVideo);
        await ensureKindDevice("videoinput", nextVideo);
      }

      if (nextAudio) {
        const preferredLost =
          !!preferredAudioDeviceIdRef.current &&
          !audioDevices.some((device) => device.deviceId === preferredAudioDeviceIdRef.current);
        preferredAudioDeviceIdRef.current = nextAudio;
        if (preferredLost || !sessionAudioDeviceIdRef.current) {
          sessionAudioDeviceIdRef.current = nextAudio;
        }
        setSelectedAudioDeviceId(nextAudio);
        await ensureKindDevice("audioinput", nextAudio);
      }
    } finally {
      reconcilingDevicesRef.current = false;
    }
  }, [ensureKindDevice, initializePreferredDevices, pickFallbackDeviceId]);

  const refreshMediaInputDevices = useCallback(async () => {
    setIsRefreshingDevices(true);
    try {
      await reconcileMediaDevices();
    } finally {
      setIsRefreshingDevices(false);
    }
  }, [reconcileMediaDevices]);

  useEffect(() => {
    void refreshMediaInputDevices();
  }, [refreshMediaInputDevices]);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;

    const onMediaDevicesChanged = () => {
      void reconcileMediaDevices();
    };

    const onActiveDeviceChanged = (kind: MediaDeviceKind, deviceId: string) => {
      if (reconcilingDevicesRef.current) return;
      if (kind === "videoinput") {
        const preferred = preferredVideoDeviceIdRef.current;
        if (preferred && deviceId !== preferred) {
          void ensureKindDevice("videoinput", preferred);
        } else if (deviceId) {
          setSelectedVideoDeviceId(deviceId);
        }
        return;
      }
      if (kind === "audioinput") {
        const preferred = preferredAudioDeviceIdRef.current;
        if (preferred && deviceId !== preferred) {
          void ensureKindDevice("audioinput", preferred);
        } else if (deviceId) {
          setSelectedAudioDeviceId(deviceId);
        }
      }
    };

    room.on(RoomEvent.MediaDevicesChanged, onMediaDevicesChanged);
    room.on(RoomEvent.ActiveDeviceChanged, onActiveDeviceChanged);
    void reconcileMediaDevices();
    return () => {
      room.off(RoomEvent.MediaDevicesChanged, onMediaDevicesChanged);
      room.off(RoomEvent.ActiveDeviceChanged, onActiveDeviceChanged);
    };
  }, [connectionState, ensureKindDevice, reconcileMediaDevices, room]);

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
    await enableMicrophone(!isMicrophoneEnabled);
  }, [canUseMic, enableMicrophone, isHost, isMicrophoneEnabled, memberMicEnabled, mode]);

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
      if (!sessionVideoDeviceIdRef.current) {
        sessionVideoDeviceIdRef.current =
          preferredVideoDeviceIdRef.current || deviceId;
      }
      preferredVideoDeviceIdRef.current = deviceId;
      setSelectedVideoDeviceId(deviceId);
      savePreferredCameraDeviceId(deviceId);
      await room.switchActiveDevice("videoinput", deviceId);
    },
    [room],
  );

  const switchAudioDevice = useCallback(
    async (deviceId: string) => {
      if (!deviceId) return;
      if (!sessionAudioDeviceIdRef.current) {
        sessionAudioDeviceIdRef.current =
          preferredAudioDeviceIdRef.current || deviceId;
      }
      preferredAudioDeviceIdRef.current = deviceId;
      setSelectedAudioDeviceId(deviceId);
      savePreferredAudioDeviceId(deviceId);
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
