"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addIceCandidateSafe,
  bindStreamToVideo,
  clearPeerConnection,
  setRemoteDescriptionSafe,
} from "@/lib/media-video";
import {
  createPeerConnection,
  type MeetingSignalMessage,
  type SignalPayload,
} from "@/lib/webrtc";
import {
  buildRecordingFilename,
  getRecordingMimeType,
  RECORDING_CONTENT_TYPE,
  triggerBrowserDownload,
  uploadRecordingBlob,
} from "@/lib/recording";
import { RecordingCompositor } from "@/lib/recording-compositor";
import { getHostGalleryLayout } from "@/lib/video-layout";
import {
  listAudioInputDevices,
  listVideoInputDevices,
  loadPreferredAudioDeviceId,
  loadPreferredCameraDeviceId,
  savePreferredAudioDeviceId,
  savePreferredCameraDeviceId,
  trackIsActive,
} from "@/lib/media-devices";

export type RecordingSaveStatus =
  | "uploading"
  | "saved"
  | "upload-failed"
  | "empty"
  | "not-recorded";

export type GalleryMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  stream: MediaStream | null;
  cameraOn: boolean;
  micOn: boolean;
  connected: boolean;
};

type ViewerMedia = {
  userId: string;
  stream: MediaStream;
  cameraOn: boolean;
  micOn: boolean;
};

type Participant = {
  user: { id: string; name: string; avatarUrl: string | null; role: string };
  handRaised: boolean;
  reaction?: string | null;
};

type UseLivestreamOptions = {
  meetingToken: string;
  meetingTitle: string;
  userId: string;
  userName: string;
  isHost: boolean;
  hostId: string;
  mode?: "livestream" | "private";
  onKicked?: () => void;
  onMeetingEnded?: () => void;
  onRecordingSaved?: (url: string) => void;
};

export function useLivestream({
  meetingToken,
  meetingTitle,
  userId,
  userName,
  isHost,
  hostId,
  mode = "livestream",
  onKicked,
  onMeetingEnded,
  onRecordingSaved,
}: UseLivestreamOptions) {
  const isPrivate = mode === "private";
  const publishMedia = isHost || isPrivate || mode === "livestream";
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const viewerDisconnectTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const signalCursorRef = useRef(new Date().toISOString());
  const connectedViewersRef = useRef<Set<string>>(new Set());
  const viewerStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const viewerHiddenVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const compositorRef = useRef<RecordingCompositor | null>(null);
  const syncViewerMediaRef = useRef<() => void>(() => {});
  const updateCompositorRef = useRef<() => void>(() => {});

  const [viewerMedia, setViewerMedia] = useState<ViewerMedia[]>([]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingMimeRef = useRef<string>("video/webm");
  const broadcastConsumersRef = useRef(new Set<"recording">());

  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isRemoteCameraOff, setIsRemoteCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState("");
  const [handRaised, setHandRaised] = useState(false);
  const [thumbsUp, setThumbsUp] = useState(0);
  const [thumbsDown, setThumbsDown] = useState(0);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [recordingSaveMessage, setRecordingSaveMessage] = useState<RecordingSaveStatus | null>(
    null,
  );
  const [memberVideoEnabled, setMemberVideoEnabled] = useState(true);
  const [memberMicEnabled, setMemberMicEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("");
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);

  const selectedVideoDeviceIdRef = useRef("");
  const selectedAudioDeviceIdRef = useRef("");
  const facingModeRef = useRef<"user" | "environment">("user");
  const recordingStartedAtRef = useRef<number | null>(null);

  const memberVideoEnabledRef = useRef(true);
  const memberMicEnabledRef = useRef(true);
  const applyMemberMediaPolicyRef = useRef<() => void>(() => {});
  const applyHostMemberMediaPolicyRef = useRef<() => void>(() => {});

  const meetingEndedRef = useRef(false);
  const endingBroadcastRef = useRef(false);
  const endBroadcastRef = useRef<() => Promise<string | null>>(async () => null);
  const stopAllRef = useRef<() => void>(() => {});
  const handleMeetingEndedRef = useRef<() => void>(() => {});

  const onKickedRef = useRef(onKicked);
  const onMeetingEndedRef = useRef(onMeetingEnded);
  const onRecordingSavedRef = useRef(onRecordingSaved);
  onKickedRef.current = onKicked;
  onMeetingEndedRef.current = onMeetingEnded;
  onRecordingSavedRef.current = onRecordingSaved;

  const viewerAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const useCompositorRecording = isHost && mode === "livestream";

  const refreshMediaInputDevices = useCallback(async () => {
    setIsRefreshingDevices(true);
    try {
      const [videoDevices, audioDevices] = await Promise.all([
        listVideoInputDevices(),
        listAudioInputDevices(),
      ]);
      setVideoInputDevices(videoDevices);
      setAudioInputDevices(audioDevices);

      if (videoDevices.length > 0) {
        const currentVideoId = selectedVideoDeviceIdRef.current;
        const videoStillAvailable = videoDevices.some((device) => device.deviceId === currentVideoId);
        if (!videoStillAvailable) {
          const nextVideoId = videoDevices[0].deviceId;
          selectedVideoDeviceIdRef.current = nextVideoId;
          setSelectedVideoDeviceId(nextVideoId);
        }
      }

      if (audioDevices.length > 0) {
        const currentAudioId = selectedAudioDeviceIdRef.current;
        const audioStillAvailable = audioDevices.some((device) => device.deviceId === currentAudioId);
        if (!audioStillAvailable) {
          const nextAudioId = audioDevices[0].deviceId;
          selectedAudioDeviceIdRef.current = nextAudioId;
          setSelectedAudioDeviceId(nextAudioId);
        }
      }
    } catch {
      /* ignore — device list unavailable */
    } finally {
      setIsRefreshingDevices(false);
    }
  }, []);

  const refreshVideoInputDevices = refreshMediaInputDevices;

  const syncVideoDeviceFromStream = useCallback(
    (stream: MediaStream) => {
      const track = stream.getVideoTracks()[0];
      const deviceId = track?.getSettings().deviceId;
      const facingMode = track?.getSettings().facingMode;
      if (facingMode === "user" || facingMode === "environment") {
        facingModeRef.current = facingMode;
      }
      if (deviceId) {
        selectedVideoDeviceIdRef.current = deviceId;
        setSelectedVideoDeviceId(deviceId);
        savePreferredCameraDeviceId(deviceId);
      }
      void refreshMediaInputDevices();
    },
    [refreshMediaInputDevices],
  );

  const syncAudioDeviceFromStream = useCallback(
    (stream: MediaStream) => {
      const track = stream.getAudioTracks()[0];
      const deviceId = track?.getSettings().deviceId;
      if (deviceId) {
        selectedAudioDeviceIdRef.current = deviceId;
        setSelectedAudioDeviceId(deviceId);
        savePreferredAudioDeviceId(deviceId);
      }
      void refreshMediaInputDevices();
    },
    [refreshMediaInputDevices],
  );

  const syncViewerMedia = useCallback(() => {
    const items: ViewerMedia[] = [];
    for (const [userId, stream] of viewerStreamsRef.current) {
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      items.push({
        userId,
        stream,
        cameraOn: trackIsActive(videoTrack),
        micOn: trackIsActive(audioTrack),
      });
    }
    setViewerMedia(items);
    updateCompositorRef.current();
  }, []);

  syncViewerMediaRef.current = syncViewerMedia;

  const removeViewerMedia = useCallback((viewerId: string) => {
    viewerStreamsRef.current.delete(viewerId);

    const audio = viewerAudioRefs.current.get(viewerId);
    if (audio) {
      audio.srcObject = null;
      viewerAudioRefs.current.delete(viewerId);
    }

    const hidden = viewerHiddenVideoRefs.current.get(viewerId);
    if (hidden) {
      hidden.srcObject = null;
      hidden.remove();
      viewerHiddenVideoRefs.current.delete(viewerId);
    }

    syncViewerMediaRef.current();
  }, []);

  const clearViewerDisconnectTimer = useCallback((viewerId: string) => {
    const timer = viewerDisconnectTimersRef.current.get(viewerId);
    if (timer) {
      clearTimeout(timer);
      viewerDisconnectTimersRef.current.delete(viewerId);
    }
  }, []);

  const teardownViewerConnection = useCallback(
    (viewerId: string) => {
      clearViewerDisconnectTimer(viewerId);

      const pc = peerConnectionsRef.current.get(viewerId);
      if (pc) {
        clearPeerConnection(pc);
        peerConnectionsRef.current.delete(viewerId);
      }

      connectedViewersRef.current.delete(viewerId);
      removeViewerMedia(viewerId);
    },
    [clearViewerDisconnectTimer, removeViewerMedia],
  );

  const attachViewerStream = useCallback((viewerId: string, stream: MediaStream) => {
    viewerStreamsRef.current.set(viewerId, stream);

    let hiddenVideo = viewerHiddenVideoRefs.current.get(viewerId);
    if (!hiddenVideo) {
      hiddenVideo = document.createElement("video");
      hiddenVideo.autoplay = true;
      hiddenVideo.playsInline = true;
      hiddenVideo.muted = true;
      hiddenVideo.style.cssText =
        "position:fixed;left:-9999px;width:2px;height:2px;opacity:0;pointer-events:none;";
      document.body.appendChild(hiddenVideo);
      viewerHiddenVideoRefs.current.set(viewerId, hiddenVideo);
    }
    hiddenVideo.srcObject = stream;
    void bindStreamToVideo(hiddenVideo, stream);

    const onTrackChange = () => syncViewerMediaRef.current();
    for (const track of stream.getTracks()) {
      track.onmute = onTrackChange;
      track.onunmute = onTrackChange;
      track.onended = onTrackChange;
    }

    syncViewerMediaRef.current();
  }, []);

  const applyHostMemberMediaPolicy = useCallback(() => {
    if (!isHost) return;
    viewerAudioRefs.current.forEach((audio) => {
      audio.muted = !memberMicEnabledRef.current;
    });
    syncViewerMediaRef.current();
  }, [isHost]);

  applyHostMemberMediaPolicyRef.current = applyHostMemberMediaPolicy;

  const applyMemberMediaPolicy = useCallback(() => {
    if (isHost) return;
    const stream = localStreamRef.current;
    if (!stream) return;

    const videoAllowed = memberVideoEnabledRef.current;
    const micAllowed = memberMicEnabledRef.current;

    for (const track of stream.getVideoTracks()) {
      if (!videoAllowed && track.enabled) {
        track.enabled = false;
      }
    }
    for (const track of stream.getAudioTracks()) {
      if (!micAllowed && track.enabled) {
        track.enabled = false;
      }
    }

    if (!videoAllowed) setIsCameraOff(true);
    if (!micAllowed) setIsMuted(true);
  }, [isHost]);

  applyMemberMediaPolicyRef.current = applyMemberMediaPolicy;

  const galleryMembers = useMemo((): GalleryMember[] => {
    const mediaById = new Map(viewerMedia.map((entry) => [entry.userId, entry]));
    return participants
      .filter((p) => p.user.id !== hostId)
      .map((p) => {
        const media = mediaById.get(p.user.id);
        return {
          userId: p.user.id,
          name: p.user.name,
          avatarUrl: p.user.avatarUrl,
          stream: media?.stream ?? null,
          cameraOn: memberVideoEnabled && (media?.cameraOn ?? false),
          micOn: memberMicEnabled && (media?.micOn ?? false),
          connected: !!media,
        };
      });
  }, [participants, viewerMedia, hostId, memberVideoEnabled, memberMicEnabled]);

  const getRecordingMainStream = useCallback((): MediaStream | null => {
    return screenStreamRef.current ?? localStreamRef.current ?? null;
  }, []);

  const syncCompositorMainStream = useCallback(() => {
    compositorRef.current?.setMainStream(getRecordingMainStream());
  }, [getRecordingMainStream]);

  const updateCompositorParticipants = useCallback(() => {
    const compositor = compositorRef.current;
    if (!compositor) return;

    void compositor.resumeAudio();

    const hostParticipant = participants.find((p) => p.user.id === hostId);
    const hostDisplayName = hostParticipant?.user.name ?? userName ?? meetingTitle;
    const localVideoTrack = localStreamRef.current?.getVideoTracks()[0];
    compositor.setHostState({
      name: hostDisplayName,
      showVideo: isScreenSharing || (!isCameraOff && trackIsActive(localVideoTrack)),
    });

    syncCompositorMainStream();
    compositor.syncHostAndScreenAudio(localStreamRef.current, screenStreamRef.current);

    const micAllowed = memberMicEnabledRef.current;
    const videoAllowed = memberVideoEnabledRef.current;
    const items = [];
    const memberIds: string[] = [];

    for (const member of galleryMembers) {
      memberIds.push(member.userId);
      const video = viewerHiddenVideoRefs.current.get(member.userId) ?? null;
      items.push({
        id: member.userId,
        name: member.name,
        video,
        cameraOn: videoAllowed && member.cameraOn && member.connected,
      });

      const stream = viewerStreamsRef.current.get(member.userId);
      const audioTrack = stream?.getAudioTracks()[0];
      const recordMemberAudio =
        micAllowed &&
        member.connected &&
        member.micOn &&
        audioTrack &&
        trackIsActive(audioTrack);

      if (recordMemberAudio) {
        compositor.connectAudioTrack(member.userId, audioTrack);
      } else {
        compositor.disconnectAudioTrack(member.userId);
      }
    }

    compositor.disconnectParticipantAudioExcept(memberIds);
    compositor.setParticipants(items);
  }, [
    galleryMembers,
    participants,
    hostId,
    userName,
    meetingTitle,
    isScreenSharing,
    isCameraOff,
    syncCompositorMainStream,
  ]);

  updateCompositorRef.current = updateCompositorParticipants;

  const syncRecordingView = useCallback(() => {
    updateCompositorParticipants();
  }, [updateCompositorParticipants]);

  const resolveIncomingStream = useCallback(
    (event: RTCTrackEvent, existing?: MediaStream | null) => {
      if (event.streams[0]) return event.streams[0];
      const stream = existing ?? new MediaStream();
      if (!stream.getTracks().includes(event.track)) {
        stream.addTrack(event.track);
      }
      return stream;
    },
    [],
  );

  const attachRemoteStream = useCallback((stream: MediaStream) => {
    remoteStreamRef.current = stream;
    setRemoteStream(stream);
    void bindStreamToVideo(remoteVideoRef.current, stream);

    const refreshFromReceivers = () => {
      void bindStreamToVideo(remoteVideoRef.current, remoteStreamRef.current);
      const videoTrack = remoteStreamRef.current?.getVideoTracks()[0];
      setIsRemoteCameraOff(!trackIsActive(videoTrack));
    };
    refreshFromReceivers();
    for (const track of stream.getTracks()) {
      track.onmute = refreshFromReceivers;
      track.onunmute = refreshFromReceivers;
      track.onended = refreshFromReceivers;
    }

    setIsLive(true);
  }, []);

  const refreshRemoteStreamFromReceivers = useCallback(
    (hostPc: RTCPeerConnection) => {
      const stream = remoteStreamRef.current ?? new MediaStream();
      let changed = false;

      for (const receiver of hostPc.getReceivers()) {
        const track = receiver.track;
        if (!track) continue;

        const sameKind = stream.getTracks().find((t) => t.kind === track.kind);
        if (sameKind && sameKind.id !== track.id) {
          stream.removeTrack(sameKind);
          changed = true;
        }
        if (!stream.getTracks().includes(track)) {
          stream.addTrack(track);
          changed = true;
        }
      }

      if (changed || stream.getTracks().length > 0) {
        attachRemoteStream(stream);
      }
    },
    [attachRemoteStream],
  );

  const attachLocalStream = useCallback((stream: MediaStream) => {
    setLocalStream(stream);
    void bindStreamToVideo(localVideoRef.current, stream);
  }, []);

  const buildRecordingStream = useCallback(() => {
    const audioTracks: MediaStreamTrack[] = [];
    const hostMic = localStreamRef.current?.getAudioTracks()[0];
    const screenAudio = screenStreamRef.current?.getAudioTracks()[0];
    if (hostMic?.readyState === "live") {
      try {
        audioTracks.push(hostMic.clone());
      } catch {
        audioTracks.push(hostMic);
      }
    }
    if (screenAudio?.readyState === "live" && screenAudio !== hostMic) {
      try {
        audioTracks.push(screenAudio.clone());
      } catch {
        audioTracks.push(screenAudio);
      }
    }

    const videoTrack =
      screenStreamRef.current?.getVideoTracks()[0] ??
      localStreamRef.current?.getVideoTracks()[0];
    if (!videoTrack && audioTracks.length === 0) return null;

    const stream = new MediaStream();
    if (videoTrack?.readyState === "live") {
      try {
        stream.addTrack(videoTrack.clone());
      } catch {
        stream.addTrack(videoTrack);
      }
    }
    for (const track of audioTracks) {
      stream.addTrack(track);
    }
    return stream;
  }, []);

  const releaseBroadcastStreamIfIdle = useCallback(() => {
    if (broadcastConsumersRef.current.size > 0) return;
    compositorRef.current?.stop();
    compositorRef.current = null;
    recordingStreamRef.current = null;
  }, []);

  const acquireBroadcastStream = useCallback(async (): Promise<MediaStream | null> => {
    if (recordingStreamRef.current?.active) {
      return recordingStreamRef.current;
    }

    let stream: MediaStream | null = null;

    if (useCompositorRecording) {
      try {
        const compositor = new RecordingCompositor();
        compositorRef.current = compositor;
        await compositor.resumeAudio();
        updateCompositorParticipants();
        compositor.startDrawing();
        stream = compositor.getStream();
        if (stream.getAudioTracks().length === 0) {
          const fallback = buildRecordingStream();
          if (fallback) {
            for (const track of fallback.getAudioTracks()) {
              if (!stream.getAudioTracks().includes(track)) {
                stream.addTrack(track);
              }
            }
          }
        }
      } catch {
        setError("Could not prepare video for streaming. Try Chrome.");
        return null;
      }
    } else {
      stream = buildRecordingStream();
    }

    if (!stream) {
      setError("Could not start stream — allow camera or microphone access and try again.");
      return null;
    }

    recordingStreamRef.current = stream;
    return stream;
  }, [buildRecordingStream, updateCompositorParticipants, useCompositorRecording]);

  const startRecording = useCallback(async () => {
    broadcastConsumersRef.current.add("recording");
    const stream = await acquireBroadcastStream();
    if (!stream) {
      broadcastConsumersRef.current.delete("recording");
      releaseBroadcastStreamIfIdle();
      return;
    }

    recordingMimeRef.current = getRecordingMimeType();
    recordingChunksRef.current = [];

    try {
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, {
          mimeType: recordingMimeRef.current,
          videoBitsPerSecond: 2_500_000,
          audioBitsPerSecond: 128_000,
        });
      } catch {
        recorder = new MediaRecorder(stream, {
          videoBitsPerSecond: 2_500_000,
          audioBitsPerSecond: 128_000,
        });
        recordingMimeRef.current = recorder.mimeType.includes("webm")
          ? recorder.mimeType
          : "video/webm";
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError("Recording was interrupted. Try ending and saving sooner, or use Chrome.");
      };

      // Chunk every 5s so multi-hour sessions don't exhaust browser memory.
      recorder.start(5_000);
      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      setRecordingElapsedSeconds(0);
      setIsRecording(true);
    } catch {
      broadcastConsumersRef.current.delete("recording");
      releaseBroadcastStreamIfIdle();
      setError("Could not start recording. Try a different browser (Chrome recommended).");
    }
  }, [acquireBroadcastStream, releaseBroadcastStreamIfIdle]);

  const beginRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") return;
    startRecording();
  }, [startRecording]);

  const updateRecordingVideoTrack = useCallback(() => {
    if (compositorRef.current) return;

    const stream = recordingStreamRef.current;
    if (!stream || !recorderRef.current) return;

    const oldVideo = stream.getVideoTracks()[0];
    if (oldVideo) {
      stream.removeTrack(oldVideo);
    }

    const newVideo =
      screenStreamRef.current?.getVideoTracks()[0] ??
      localStreamRef.current?.getVideoTracks()[0];
    if (newVideo && !stream.getVideoTracks().includes(newVideo)) {
      stream.addTrack(newVideo);
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;

      const buildBlob = () => {
        if (recordingChunksRef.current.length === 0) return null;
        return new Blob(recordingChunksRef.current, { type: RECORDING_CONTENT_TYPE });
      };

      const finish = (blob: Blob | null) => {
        broadcastConsumersRef.current.delete("recording");
        releaseBroadcastStreamIfIdle();
        recordingChunksRef.current = [];
        recorderRef.current = null;
        setIsRecording(false);
        recordingStartedAtRef.current = null;
        setRecordingElapsedSeconds(0);
        resolve(blob);
      };

      if (!recorder || recorder.state === "inactive") {
        finish(buildBlob());
        return;
      }

      let settled = false;
      const settle = (blob: Blob | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(hardTimeout);
        finish(blob);
      };

      recorder.onstop = () => settle(buildBlob());

      const hardTimeout = window.setTimeout(() => {
        try {
          if (recorder.state !== "inactive") {
            recorder.requestData();
            recorder.stop();
          }
        } catch {
          /* ignore */
        }
        settle(buildBlob());
      }, 5000);

      try {
        if (recorder.state === "recording" || recorder.state === "paused") {
          recorder.requestData();
        }
        recorder.stop();
      } catch {
        settle(buildBlob());
      }
    });
  }, [releaseBroadcastStreamIfIdle]);

  const sendSignal = useCallback(
    async (type: string, toUserId: string | null, payload: SignalPayload = {}) => {
      await fetch(`/api/meetings/${meetingToken}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, toUserId, payload }),
      });
    },
    [meetingToken],
  );

  const addLocalTracks = useCallback((pc: RTCPeerConnection) => {
    const baseStream = localStreamRef.current;
    const outboundStream = baseStream ?? screenStreamRef.current;
    if (!outboundStream) return;

    const videoTrack =
      screenStreamRef.current?.getVideoTracks()[0] ??
      baseStream?.getVideoTracks()[0];
    const audioTrack = baseStream?.getAudioTracks()[0];

    if (videoTrack && !pc.getSenders().some((sender) => sender.track === videoTrack)) {
      pc.addTrack(videoTrack, outboundStream);
    }
    if (audioTrack && !pc.getSenders().some((sender) => sender.track === audioTrack)) {
      pc.addTrack(audioTrack, outboundStream);
    }
  }, []);

  const createHostConnection = useCallback(
    async (viewerId: string) => {
      const existing = peerConnectionsRef.current.get(viewerId);
      if (
        existing &&
        (existing.connectionState === "connected" || existing.connectionState === "connecting")
      ) {
        return;
      }

      if (existing) {
        teardownViewerConnection(viewerId);
      }

      const pc = createPeerConnection();
      peerConnectionsRef.current.set(viewerId, pc);
      addLocalTracks(pc);

      if (isPrivate || mode === "livestream") {
        pc.ontrack = (event) => {
          const stream = resolveIncomingStream(
            event,
            viewerStreamsRef.current.get(viewerId) ?? null,
          );
          if (!stream) return;

          if (isPrivate && remoteVideoRef.current) {
            attachRemoteStream(stream);
            return;
          }

          if (mode === "livestream") {
            attachViewerStream(viewerId, stream);

            let audio = viewerAudioRefs.current.get(viewerId);
            if (!audio) {
              audio = document.createElement("audio");
              audio.autoplay = true;
              viewerAudioRefs.current.set(viewerId, audio);
            }
            audio.muted = !memberMicEnabledRef.current;
            audio.srcObject = stream;
            void audio.play().catch(() => {});
            applyHostMemberMediaPolicyRef.current();
          }
        };
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal("ice", viewerId, { candidate: event.candidate.toJSON() });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          clearViewerDisconnectTimer(viewerId);
          return;
        }

        if (pc.connectionState === "disconnected") {
          clearViewerDisconnectTimer(viewerId);
          const timer = setTimeout(() => {
            viewerDisconnectTimersRef.current.delete(viewerId);
            if (
              pc.connectionState === "disconnected" ||
              pc.connectionState === "failed" ||
              pc.connectionState === "closed"
            ) {
              teardownViewerConnection(viewerId);
            }
          }, 2500);
          viewerDisconnectTimersRef.current.set(viewerId, timer);
          return;
        }

        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          teardownViewerConnection(viewerId);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal("offer", viewerId, { sdp: offer });
      connectedViewersRef.current.add(viewerId);
    },
    [
      addLocalTracks,
      attachRemoteStream,
      attachViewerStream,
      clearViewerDisconnectTimer,
      isPrivate,
      mode,
      resolveIncomingStream,
      sendSignal,
      teardownViewerConnection,
    ],
  );

  const handleHostSignal = useCallback(
    async (signal: MeetingSignalMessage) => {
      if (signal.type === "viewer-ready" && signal.fromUserId !== userId) {
        await createHostConnection(signal.fromUserId);
        return;
      }

      if (signal.type === "answer") {
        const pc = peerConnectionsRef.current.get(signal.fromUserId);
        if (pc && signal.payload.sdp) {
          await setRemoteDescriptionSafe(pc, signal.payload.sdp);
        }
        return;
      }

      if (signal.type === "ice") {
        const pc = peerConnectionsRef.current.get(signal.fromUserId);
        if (pc && signal.payload.candidate) {
          await addIceCandidateSafe(pc, signal.payload.candidate);
        }
      }
    },
    [createHostConnection, userId],
  );

  const handleViewerSignal = useCallback(
    async (signal: MeetingSignalMessage) => {
      if (signal.type === "kick" && signal.toUserId === userId) {
        stopAllRef.current();
        onKickedRef.current?.();
        return;
      }

      if (signal.type === "host-ended") {
        handleMeetingEndedRef.current();
        return;
      }

      if (signal.type === "member-video-policy") {
        const allowed = signal.payload.enabled !== false;
        memberVideoEnabledRef.current = allowed;
        setMemberVideoEnabled(allowed);
        applyMemberMediaPolicyRef.current();
        return;
      }

      if (signal.type === "member-mic-policy") {
        const allowed = signal.payload.enabled !== false;
        memberMicEnabledRef.current = allowed;
        setMemberMicEnabled(allowed);
        applyMemberMediaPolicyRef.current();
        return;
      }

      if (signal.type === "offer" && signal.fromUserId === hostId) {
        let pc = peerConnectionsRef.current.get(hostId);
        if (
          pc &&
          pc.connectionState !== "connected" &&
          pc.connectionState !== "connecting"
        ) {
          clearPeerConnection(pc);
          peerConnectionsRef.current.delete(hostId);
          pc = undefined;
        }

        if (!pc) {
          pc = createPeerConnection();
          peerConnectionsRef.current.set(hostId, pc);

          if (isPrivate || mode === "livestream") {
            addLocalTracks(pc);
          }

          pc.ontrack = (event) => {
            const stream = resolveIncomingStream(event, remoteStreamRef.current);
            attachRemoteStream(stream);
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              void sendSignal("ice", hostId, { candidate: event.candidate.toJSON() });
            }
          };

          pc.onconnectionstatechange = () => {
            if (pc!.connectionState === "connected") return;

            const requestReconnect = () => {
              const current = peerConnectionsRef.current.get(hostId);
              if (current !== pc) return;
              clearPeerConnection(pc!);
              peerConnectionsRef.current.delete(hostId);
              remoteStreamRef.current = null;
              setRemoteStream(null);
              setIsRemoteCameraOff(true);
              setIsLive(false);
              void sendSignal("viewer-ready", hostId);
            };

            if (pc!.connectionState === "disconnected") {
              window.setTimeout(() => {
                if (
                  pc!.connectionState === "disconnected" ||
                  pc!.connectionState === "failed" ||
                  pc!.connectionState === "closed"
                ) {
                  requestReconnect();
                }
              }, 2500);
              return;
            }

            if (pc!.connectionState === "failed" || pc!.connectionState === "closed") {
              requestReconnect();
            }
          };
        }

        if (signal.payload.sdp) {
          await setRemoteDescriptionSafe(pc, signal.payload.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal("answer", hostId, { sdp: answer });
          refreshRemoteStreamFromReceivers(pc);
        }
        return;
      }

      if (signal.type === "ice" && signal.fromUserId === hostId) {
        const pc = peerConnectionsRef.current.get(hostId);
        if (pc && signal.payload.candidate) {
          await addIceCandidateSafe(pc, signal.payload.candidate);
        }
      }
    },
    [addLocalTracks, attachRemoteStream, hostId, isPrivate, mode, refreshRemoteStreamFromReceivers, resolveIncomingStream, sendSignal, userId],
  );

  const pollSignals = useCallback(async () => {
    if (meetingEndedRef.current) return;

    const res = await fetch(
      `/api/meetings/${meetingToken}/signal?since=${encodeURIComponent(signalCursorRef.current)}`,
    );
    if (!res.ok) return;

    const data = await res.json();
    for (const signal of data.signals as MeetingSignalMessage[]) {
      signalCursorRef.current = signal.createdAt;
      if (isHost) {
        await handleHostSignal(signal);
      } else {
        await handleViewerSignal(signal);
      }
    }
  }, [handleHostSignal, handleViewerSignal, isHost, meetingToken]);

  const fetchParticipants = useCallback(async () => {
    if (meetingEndedRef.current) return;

    const res = await fetch(`/api/meetings/${meetingToken}/participants`);
    if (!res.ok) return;
    const data = await res.json();

    if (data.meetingStatus === "ENDED") {
      handleMeetingEndedRef.current();
      return;
    }

    setParticipants(data.participants);
    setThumbsUp(data.thumbsUp ?? 0);
    setThumbsDown(data.thumbsDown ?? 0);
    const me = (data.participants as Participant[]).find((p) => p.user.id === userId);
    if (me) {
      setHandRaised(me.handRaised);
      setMyReaction(me.reaction ?? null);
    }
    const viewers = (data.participants as Participant[]).filter(
      (p) => p.user.id !== data.hostId,
    );
    setViewerCount(viewers.length);

    const videoAllowed = data.memberVideoEnabled !== false;
    const micAllowed = data.memberMicEnabled !== false;
    memberVideoEnabledRef.current = videoAllowed;
    memberMicEnabledRef.current = micAllowed;
    setMemberVideoEnabled(videoAllowed);
    setMemberMicEnabled(micAllowed);

    if (isHost) {
      applyHostMemberMediaPolicyRef.current();
    } else {
      applyMemberMediaPolicyRef.current();
    }

    syncViewerMediaRef.current();
  }, [isHost, meetingToken, userId]);

  const startBroadcast = useCallback(async () => {
    const markLive = () => {
      if (isHost) setIsLive(true);
    };

    const existing = localStreamRef.current;
    if (existing?.active) {
      attachLocalStream(existing);
      markLive();
      return;
    }

    try {
      const preferredDeviceId = selectedVideoDeviceIdRef.current;
      const preferredAudioId = selectedAudioDeviceIdRef.current;
      const audioConstraints: MediaTrackConstraints = preferredAudioId
        ? {
            deviceId: { ideal: preferredAudioId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: preferredDeviceId
          ? {
              deviceId: { exact: preferredDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: audioConstraints,
      });
      localStreamRef.current = stream;
      attachLocalStream(stream);
      syncVideoDeviceFromStream(stream);
      syncAudioDeviceFromStream(stream);
      markLive();
      applyMemberMediaPolicyRef.current();
    } catch {
      try {
        const preferredAudioId = selectedAudioDeviceIdRef.current;
        const audioOnly = await navigator.mediaDevices.getUserMedia({
          audio: preferredAudioId
            ? {
                deviceId: { ideal: preferredAudioId },
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            : { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        localStreamRef.current = audioOnly;
        attachLocalStream(audioOnly);
        syncAudioDeviceFromStream(audioOnly);
        setIsCameraOff(true);
        markLive();
        applyMemberMediaPolicyRef.current();
      } catch {
        if (!isHost) {
          // Viewers can still watch without publishing camera/mic.
          void sendSignal("viewer-ready", hostId);
        }
        setError(
          isHost
            ? "Microphone access was denied. Allow mic (camera optional) and reload to join."
            : "",
        );
      }
    }
  }, [attachLocalStream, hostId, isHost, sendSignal, syncAudioDeviceFromStream, syncVideoDeviceFromStream]);

  const stopAll = useCallback(() => {
    broadcastConsumersRef.current.clear();

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    compositorRef.current?.stop();
    compositorRef.current = null;

    viewerDisconnectTimersRef.current.forEach((timer) => clearTimeout(timer));
    viewerDisconnectTimersRef.current.clear();

    for (const pc of peerConnectionsRef.current.values()) {
      clearPeerConnection(pc);
    }
    peerConnectionsRef.current.clear();
    connectedViewersRef.current.clear();
    viewerAudioRefs.current.forEach((a) => {
      a.srcObject = null;
    });
    viewerAudioRefs.current.clear();
    viewerHiddenVideoRefs.current.forEach((video) => {
      video.srcObject = null;
      video.remove();
    });
    viewerHiddenVideoRefs.current.clear();
    viewerStreamsRef.current.clear();
    setViewerMedia([]);

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    recordingStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIsRemoteCameraOff(false);
    setIsLive(false);
  }, []);

  const handleMeetingEnded = useCallback(() => {
    if (meetingEndedRef.current || endingBroadcastRef.current) return;

    const activelyRecording =
      recorderRef.current?.state === "recording" || recorderRef.current?.state === "paused";

    if (isHost && activelyRecording) {
      void endBroadcastRef.current();
      return;
    }

    meetingEndedRef.current = true;
    stopAll();
    setMeetingEnded(true);
  }, [isHost, stopAll]);

  stopAllRef.current = stopAll;
  handleMeetingEndedRef.current = handleMeetingEnded;

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      if (isHost || publishMedia) {
        await startBroadcast();
      }

      if (!cancelled && !isHost) {
        await sendSignal("viewer-ready", hostId);
      }
    }

    void connect();

    return () => {
      cancelled = true;
      stopAll();
    };
  }, [hostId, isHost, meetingToken, publishMedia, sendSignal, startBroadcast, stopAll]);

  useEffect(() => {
    void bindStreamToVideo(localVideoRef.current, localStream);
  }, [localStream]);

  useEffect(() => {
    void bindStreamToVideo(remoteVideoRef.current, remoteStream);
  }, [remoteStream]);

  useEffect(() => {
    if (isHost) return;

    const retryInterval = setInterval(() => {
      if (meetingEndedRef.current) return;

      const pc = peerConnectionsRef.current.get(hostId);
      const connected =
        pc &&
        (pc.connectionState === "connected" || pc.connectionState === "connecting");

      if (connected) return;

      if (pc) {
        clearPeerConnection(pc);
        peerConnectionsRef.current.delete(hostId);
      }

      remoteStreamRef.current = null;
      setRemoteStream(null);
      setIsRemoteCameraOff(true);
      setIsLive(false);

      void sendSignal("viewer-ready", hostId);
    }, 5000);

    return () => clearInterval(retryInterval);
  }, [hostId, isHost, sendSignal]);

  const pollSignalsRef = useRef(pollSignals);
  const fetchParticipantsRef = useRef(fetchParticipants);
  pollSignalsRef.current = pollSignals;
  fetchParticipantsRef.current = fetchParticipants;

  useEffect(() => {
    const signalInterval = setInterval(() => void pollSignalsRef.current(), 1000);
    const participantInterval = setInterval(
      () => void fetchParticipantsRef.current(),
      4000,
    );
    void fetchParticipantsRef.current();

    return () => {
      clearInterval(signalInterval);
      clearInterval(participantInterval);
    };
  }, [meetingToken]);

  useEffect(() => {
    if (!isHost || mode !== "livestream") return;
    const mediaInterval = setInterval(() => syncViewerMediaRef.current(), 1500);
    return () => clearInterval(mediaInterval);
  }, [isHost, mode]);

  useEffect(() => {
    const savedDeviceId = loadPreferredCameraDeviceId();
    if (savedDeviceId) {
      selectedVideoDeviceIdRef.current = savedDeviceId;
      setSelectedVideoDeviceId(savedDeviceId);
    }
    const savedAudioId = loadPreferredAudioDeviceId();
    if (savedAudioId) {
      selectedAudioDeviceIdRef.current = savedAudioId;
      setSelectedAudioDeviceId(savedAudioId);
    }
  }, []);

  useEffect(() => {
    if (!publishMedia || typeof navigator === "undefined" || !navigator.mediaDevices) return;

    const handleDeviceChange = () => {
      void refreshMediaInputDevices();
    };

    void refreshMediaInputDevices();
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, [publishMedia, refreshMediaInputDevices]);

  useEffect(() => {
    if (!isRecording || !compositorRef.current) return;

    updateCompositorParticipants();
    const interval = window.setInterval(updateCompositorParticipants, 1000);
    return () => window.clearInterval(interval);
  }, [
    isRecording,
    isScreenSharing,
    isCameraOff,
    isMuted,
    memberMicEnabled,
    memberVideoEnabled,
    galleryMembers,
    updateCompositorParticipants,
  ]);

  useEffect(() => {
    if (!isRecording) return;

    const tick = () => {
      if (!recordingStartedAtRef.current) return;
      setRecordingElapsedSeconds(
        Math.floor((Date.now() - recordingStartedAtRef.current) / 1000),
      );
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [isRecording]);

  const toggleMute = useCallback(() => {
    if (!isHost && !memberMicEnabledRef.current) {
      setError("The host has turned off member microphones.");
      return;
    }
    const stream = localStreamRef.current;
    if (!stream) return;
    for (const track of stream.getAudioTracks()) {
      track.enabled = !track.enabled;
    }
    setIsMuted((m) => !m);
    setError("");
    if (compositorRef.current) {
      compositorRef.current.syncHostAndScreenAudio(localStreamRef.current, screenStreamRef.current);
    }
  }, [isHost]);

  const toggleCamera = useCallback(() => {
    if (!isHost && !memberVideoEnabledRef.current) {
      setError("The host has turned off member cameras.");
      return;
    }
    const stream = localStreamRef.current;
    if (!stream) return;
    for (const track of stream.getVideoTracks()) {
      track.enabled = !track.enabled;
    }
    setIsCameraOff((c) => !c);
    syncViewerMediaRef.current();
    if (!isScreenSharing) {
      updateRecordingVideoTrack();
    }
    setError("");
  }, [isHost, isScreenSharing, updateRecordingVideoTrack]);

  const renegotiateAllViewers = useCallback(async () => {
    if (!isHost) return;

    const videoTrack =
      screenStreamRef.current?.getVideoTracks()[0] ??
      localStreamRef.current?.getVideoTracks()[0];
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    const outboundStream = localStreamRef.current ?? screenStreamRef.current;

    for (const viewerId of connectedViewersRef.current) {
      const pc = peerConnectionsRef.current.get(viewerId);
      if (!pc) continue;

      const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
      const audioSender = pc.getSenders().find((s) => s.track?.kind === "audio");

      if (videoTrack) {
        if (videoSender) {
          await videoSender.replaceTrack(videoTrack);
        } else if (outboundStream) {
          pc.addTrack(videoTrack, outboundStream);
        }
      } else if (videoSender) {
        await videoSender.replaceTrack(null);
      }

      if (audioTrack) {
        if (audioSender) {
          await audioSender.replaceTrack(audioTrack);
        } else if (outboundStream) {
          pc.addTrack(audioTrack, outboundStream);
        }
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal("offer", viewerId, { sdp: offer });
    }

    updateRecordingVideoTrack();
  }, [isHost, sendSignal, updateRecordingVideoTrack]);

  const replaceVideoOnAllConnections = useCallback(
    async (newStream: MediaStream) => {
      const videoTrack = newStream.getVideoTracks()[0];
      if (!videoTrack) return;

      const outboundStream = localStreamRef.current ?? newStream;

      for (const [viewerId, pc] of peerConnectionsRef.current.entries()) {
        try {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(videoTrack);
          } else if (outboundStream) {
            pc.addTrack(videoTrack, outboundStream);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendSignal("offer", viewerId, { sdp: offer });
          }
        } catch (error) {
          console.error("Failed to update video track for viewer", viewerId, error);
        }
      }
      updateRecordingVideoTrack();
    },
    [sendSignal, updateRecordingVideoTrack],
  );

  const replaceAudioOnAllConnections = useCallback(
    async (stream: MediaStream) => {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const outboundStream = localStreamRef.current ?? stream;

      for (const [viewerId, pc] of peerConnectionsRef.current.entries()) {
        try {
          const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
          if (sender) {
            await sender.replaceTrack(audioTrack);
          } else if (outboundStream) {
            pc.addTrack(audioTrack, outboundStream);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendSignal("offer", viewerId, { sdp: offer });
          }
        } catch (error) {
          console.error("Failed to update audio track for viewer", viewerId, error);
        }
      }

      if (compositorRef.current) {
        compositorRef.current.syncHostAndScreenAudio(
          localStreamRef.current,
          screenStreamRef.current,
        );
      }
    },
    [sendSignal],
  );

  const applyNewVideoTrack = useCallback(
    async (newTrack: MediaStreamTrack) => {
      let stream = localStreamRef.current;
      if (!stream) {
        stream = new MediaStream();
        localStreamRef.current = stream;
      }

      const keepCameraOff = isCameraOff;
      for (const oldTrack of stream.getVideoTracks()) {
        stream.removeTrack(oldTrack);
        oldTrack.stop();
      }

      newTrack.enabled = !keepCameraOff;
      stream.addTrack(newTrack);
      setLocalStream(stream);
      setIsCameraOff(keepCameraOff);

      const settings = newTrack.getSettings();
      if (settings.facingMode === "user" || settings.facingMode === "environment") {
        facingModeRef.current = settings.facingMode;
      }
      if (settings.deviceId) {
        selectedVideoDeviceIdRef.current = settings.deviceId;
        setSelectedVideoDeviceId(settings.deviceId);
        savePreferredCameraDeviceId(settings.deviceId);
      }

      if (!isScreenSharing) {
        attachLocalStream(stream);
        await replaceVideoOnAllConnections(stream);
        syncCompositorMainStream();
      } else {
        syncCompositorMainStream();
        updateRecordingVideoTrack();
      }

      syncViewerMediaRef.current();
      void refreshMediaInputDevices();
      setError("");
    },
    [
      attachLocalStream,
      isCameraOff,
      isScreenSharing,
      refreshMediaInputDevices,
      replaceVideoOnAllConnections,
      syncCompositorMainStream,
      updateRecordingVideoTrack,
    ],
  );

  const requestAudioTrack = useCallback(async (constraints: MediaTrackConstraints) => {
    const preview = await navigator.mediaDevices.getUserMedia({
      audio: constraints,
      video: false,
    });
    const newTrack = preview.getAudioTracks()[0];
    if (!newTrack) {
      preview.getTracks().forEach((track) => track.stop());
      throw new Error("No microphone track");
    }
    for (const track of preview.getVideoTracks()) {
      track.stop();
    }
    return newTrack;
  }, []);

  const applyNewAudioTrack = useCallback(
    async (newTrack: MediaStreamTrack) => {
      let stream = localStreamRef.current;
      if (!stream) {
        stream = new MediaStream();
        localStreamRef.current = stream;
      }

      const keepMuted = isMuted;
      for (const oldTrack of stream.getAudioTracks()) {
        stream.removeTrack(oldTrack);
        oldTrack.stop();
      }

      newTrack.enabled = !keepMuted;
      stream.addTrack(newTrack);
      setLocalStream(new MediaStream(stream.getTracks()));

      await replaceAudioOnAllConnections(stream);

      const settings = newTrack.getSettings();
      if (settings.deviceId) {
        selectedAudioDeviceIdRef.current = settings.deviceId;
        setSelectedAudioDeviceId(settings.deviceId);
        savePreferredAudioDeviceId(settings.deviceId);
      }

      void refreshMediaInputDevices();
      setError("");
    },
    [isMuted, refreshMediaInputDevices, replaceAudioOnAllConnections],
  );

  const switchAudioDevice = useCallback(
    async (deviceId: string) => {
      if (!deviceId || deviceId === selectedAudioDeviceIdRef.current) return;

      selectedAudioDeviceIdRef.current = deviceId;
      setSelectedAudioDeviceId(deviceId);
      savePreferredAudioDeviceId(deviceId);

      try {
        let newTrack: MediaStreamTrack;
        try {
          newTrack = await requestAudioTrack({
            deviceId: { exact: deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          });
        } catch {
          newTrack = await requestAudioTrack({
            deviceId: { ideal: deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          });
        }
        await applyNewAudioTrack(newTrack);
      } catch {
        setError(
          "Could not switch to that microphone. Try another device or check browser permissions.",
        );
      }
    },
    [applyNewAudioTrack, requestAudioTrack],
  );

  const requestVideoTrack = useCallback(
    async (constraints: MediaTrackConstraints) => {
      const preview = await navigator.mediaDevices.getUserMedia({
        video: constraints,
        audio: false,
      });
      const newTrack = preview.getVideoTracks()[0];
      if (!newTrack) {
        preview.getTracks().forEach((track) => track.stop());
        throw new Error("No camera track");
      }
      for (const track of preview.getAudioTracks()) {
        track.stop();
      }
      return newTrack;
    },
    [],
  );

  const switchVideoDevice = useCallback(
    async (deviceId: string) => {
      if (!deviceId || deviceId === selectedVideoDeviceIdRef.current) return;

      selectedVideoDeviceIdRef.current = deviceId;
      setSelectedVideoDeviceId(deviceId);
      savePreferredCameraDeviceId(deviceId);

      try {
        let newTrack: MediaStreamTrack;
        try {
          newTrack = await requestVideoTrack({
            deviceId: { exact: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          });
        } catch {
          newTrack = await requestVideoTrack({
            deviceId: { ideal: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          });
        }
        await applyNewVideoTrack(newTrack);
      } catch {
        setError("Could not switch to that camera. Try another device or check browser permissions.");
      }
    },
    [applyNewVideoTrack, requestVideoTrack],
  );

  const switchFacingMode = useCallback(async () => {
    const nextFacing = facingModeRef.current === "user" ? "environment" : "user";
    try {
      const newTrack = await requestVideoTrack({
        facingMode: { ideal: nextFacing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      });
      facingModeRef.current = nextFacing;
      await applyNewVideoTrack(newTrack);
    } catch {
      setError("Could not switch cameras. Try choosing a device from the list or refresh devices.");
    }
  }, [applyNewVideoTrack, requestVideoTrack]);

  const stopScreenShare = useCallback(async () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    if (localStreamRef.current) {
      attachLocalStream(localStreamRef.current);
      await replaceVideoOnAllConnections(localStreamRef.current);
    } else {
      await renegotiateAllViewers();
    }
    if (compositorRef.current) {
      syncCompositorMainStream();
      compositorRef.current.syncHostAndScreenAudio(localStreamRef.current, null);
    }
    setIsScreenSharing(false);
  }, [attachLocalStream, replaceVideoOnAllConnections, renegotiateAllViewers, syncCompositorMainStream]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    if (!localStreamRef.current) {
      setError("Allow camera or microphone access before sharing your screen.");
      return;
    }

    try {
      let screenStream: MediaStream;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } catch {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      }

      const videoTrack = screenStream.getVideoTracks()[0];
      if (!videoTrack) {
        screenStream.getTracks().forEach((track) => track.stop());
        throw new Error("No screen video track");
      }

      screenStreamRef.current = screenStream;
      void bindStreamToVideo(localVideoRef.current, screenStream);
      await replaceVideoOnAllConnections(screenStream);

      if (compositorRef.current) {
        syncCompositorMainStream();
        compositorRef.current.syncHostAndScreenAudio(localStreamRef.current, screenStream);
      }

      setIsScreenSharing(true);
      if (isHost) setIsLive(true);

      videoTrack.addEventListener(
        "ended",
        () => {
          void stopScreenShare();
        },
        { once: true },
      );
      setError("");
    } catch {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      if (localStreamRef.current) {
        attachLocalStream(localStreamRef.current);
      }
      setIsScreenSharing(false);
      setError("Could not share screen. Choose a window or tab when prompted, or try Chrome.");
    }
  }, [
    attachLocalStream,
    isHost,
    isScreenSharing,
    replaceVideoOnAllConnections,
    stopScreenShare,
    syncCompositorMainStream,
  ]);

  const endBroadcast = useCallback(async () => {
    if (!isHost || meetingEndedRef.current || endingBroadcastRef.current) return null;

    endingBroadcastRef.current = true;
    setIsSavingRecording(true);

    const wasRecording =
      isRecording ||
      recorderRef.current?.state === "recording" ||
      recorderRef.current?.state === "paused";

    let recordingUrl: string | null = null;
    let recordingBlob: Blob | null = null;
    const filename = buildRecordingFilename(meetingTitle, RECORDING_CONTENT_TYPE);

    try {
      recordingBlob = await stopRecording();
      await sendSignal("host-ended", null);

      const patchRes = await fetch(`/api/meetings/${meetingToken}/recording`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end", publicUrl: null }),
      });

      if (!patchRes.ok) {
        const patchErr = await patchRes.json().catch(() => ({}));
        const patchMessage =
          typeof patchErr.error === "string" ? patchErr.error : "Could not finalize meeting";
        setError(patchMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not end livestream.");
    } finally {
      stopAll();
      setIsSavingRecording(false);
      meetingEndedRef.current = true;
      setMeetingEnded(true);
      endingBroadcastRef.current = false;
    }

    if (recordingBlob && recordingBlob.size > 0) {
      setRecordingSaveMessage("uploading");
      try {
        const result = await uploadRecordingBlob(meetingToken, recordingBlob, filename);
        recordingUrl = result.publicUrl;

        const linkRes = await fetch(`/api/meetings/${meetingToken}/recording`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicUrl: recordingUrl }),
        });

        if (!linkRes.ok) {
          throw new Error("Recording uploaded but could not be linked in the library.");
        }

        onRecordingSavedRef.current?.(recordingUrl);
        setRecordingSaveMessage("saved");
        setError("");
      } catch (uploadError) {
        console.error("Recording upload failed:", uploadError);
        triggerBrowserDownload(recordingBlob, filename);
        const message =
          uploadError instanceof Error ? uploadError.message : "Upload failed";
        setRecordingSaveMessage("upload-failed");
        setError(
          `Recording could not be saved to the library (${message}). A copy was downloaded to your device — contact support to add it manually.`,
        );
      }
    } else if (wasRecording) {
      setRecordingSaveMessage("empty");
      setError("");
    } else {
      setRecordingSaveMessage("not-recorded");
      setError("");
    }

    return recordingUrl;
  }, [
    isHost,
    meetingTitle,
    meetingToken,
    sendSignal,
    stopAll,
    stopRecording,
    isRecording,
  ]);

  endBroadcastRef.current = endBroadcast;

  const toggleHand = useCallback(async () => {
    const action = handRaised ? "lower-hand" : "raise-hand";
    await fetch(`/api/meetings/${meetingToken}/chat`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    setHandRaised(!handRaised);
    void fetchParticipants();
  }, [fetchParticipants, handRaised, meetingToken, userId]);

  const kickViewer = useCallback(
    async (viewerId: string) => {
      await fetch(`/api/meetings/${meetingToken}/chat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: viewerId, action: "block" }),
      });
      await sendSignal("kick", viewerId);
      teardownViewerConnection(viewerId);
      void fetchParticipants();
    },
    [fetchParticipants, meetingToken, sendSignal, teardownViewerConnection],
  );

  const setMemberMediaPolicy = useCallback(
    async (action: "set-member-video" | "set-member-mic", enabled: boolean) => {
      if (!isHost) return;

      const res = await fetch(`/api/meetings/${meetingToken}/chat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, enabled }),
      });

      if (!res.ok) {
        setError("Could not update member media settings.");
        return;
      }

      const data = await res.json();
      const videoAllowed = data.memberVideoEnabled !== false;
      const micAllowed = data.memberMicEnabled !== false;
      memberVideoEnabledRef.current = videoAllowed;
      memberMicEnabledRef.current = micAllowed;
      setMemberVideoEnabled(videoAllowed);
      setMemberMicEnabled(micAllowed);
      applyHostMemberMediaPolicyRef.current();
      setError("");
    },
    [isHost, meetingToken],
  );

  const toggleMemberVideo = useCallback(() => {
    void setMemberMediaPolicy("set-member-video", !memberVideoEnabled);
  }, [memberVideoEnabled, setMemberMediaPolicy]);

  const toggleMemberMic = useCallback(() => {
    void setMemberMediaPolicy("set-member-mic", !memberMicEnabled);
  }, [memberMicEnabled, setMemberMediaPolicy]);

  const sendReaction = useCallback(
    async (action: "react-up" | "react-down") => {
      const res = await fetch(`/api/meetings/${meetingToken}/chat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        const data = await res.json();
        setMyReaction(data.reaction ?? null);
      }
      void fetchParticipants();
    },
    [fetchParticipants, meetingToken, userId],
  );

  return {
    localVideoRef,
    remoteVideoRef,
    isLive,
    isMuted,
    isCameraOff,
    isRemoteCameraOff,
    isScreenSharing,
    isRecording,
    isSavingRecording,
    recordingElapsedSeconds,
    videoInputDevices,
    audioInputDevices,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    switchVideoDevice,
    switchAudioDevice,
    switchFacingMode,
    refreshVideoInputDevices,
    refreshMediaInputDevices,
    isRefreshingDevices,
    participants,
    galleryMembers,
    viewerCount,
    error,
    handRaised,
    thumbsUp,
    thumbsDown,
    myReaction,
    memberVideoEnabled,
    memberMicEnabled,
    toggleMute,
    toggleCamera,
    toggleMemberVideo,
    toggleMemberMic,
    toggleScreenShare,
    beginRecording,
    endBroadcast,
    toggleHand,
    sendReaction,
    kickViewer,
    meetingEnded,
    recordingSaveMessage,
    syncRecordingView,
  };
}
