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
  uploadRecordingBlob,
} from "@/lib/recording";
import { RecordingCompositor } from "@/lib/recording-compositor";
import {
  listVideoInputDevices,
  loadPreferredCameraDeviceId,
  savePreferredCameraDeviceId,
} from "@/lib/media-devices";

export type RecordingSaveStatus = "saved" | "upload-failed" | "empty" | "not-recorded";

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

function trackIsActive(track: MediaStreamTrack | undefined) {
  return !!track && track.readyState === "live" && track.enabled;
}

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

  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
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
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);

  const selectedVideoDeviceIdRef = useRef("");
  const facingModeRef = useRef<"user" | "environment">("user");
  const recordingStartedAtRef = useRef<number | null>(null);

  const memberVideoEnabledRef = useRef(true);
  const memberMicEnabledRef = useRef(true);
  const applyMemberMediaPolicyRef = useRef<() => void>(() => {});
  const applyHostMemberMediaPolicyRef = useRef<() => void>(() => {});

  const meetingEndedRef = useRef(false);
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

  const refreshVideoInputDevices = useCallback(async () => {
    setIsRefreshingDevices(true);
    try {
      const devices = await listVideoInputDevices();
      setVideoInputDevices(devices);

      if (devices.length === 0) return;

      const currentId = selectedVideoDeviceIdRef.current;
      const stillAvailable = devices.some((device) => device.deviceId === currentId);
      if (!stillAvailable) {
        const nextId = devices[0].deviceId;
        selectedVideoDeviceIdRef.current = nextId;
        setSelectedVideoDeviceId(nextId);
      }
    } catch {
      /* ignore — device list unavailable */
    } finally {
      setIsRefreshingDevices(false);
    }
  }, []);

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
      void refreshVideoInputDevices();
    },
    [refreshVideoInputDevices],
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

  const updateCompositorParticipants = useCallback(() => {
    const compositor = compositorRef.current;
    if (!compositor) return;

    compositor.syncHostAndScreenAudio(localStreamRef.current, screenStreamRef.current);

    const videoAllowed = memberVideoEnabledRef.current;
    const micAllowed = memberMicEnabledRef.current;
    const items = [];
    for (const [viewerUserId, stream] of viewerStreamsRef.current) {
      const participant = participants.find((p) => p.user.id === viewerUserId);
      const video = viewerHiddenVideoRefs.current.get(viewerUserId) ?? null;
      const videoTrack = stream.getVideoTracks()[0];
      items.push({
        id: viewerUserId,
        name: participant?.user.name ?? "Member",
        video,
        cameraOn: videoAllowed && trackIsActive(videoTrack),
      });
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack && micAllowed) {
        compositor.connectAudioTrack(viewerUserId, audioTrack);
      } else {
        compositor.disconnectAudioTrack(viewerUserId);
      }
    }
    compositor.setParticipants(items);
  }, [participants]);

  updateCompositorRef.current = updateCompositorParticipants;

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
    };
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
    if (videoTrack) stream.addTrack(videoTrack);
    for (const track of audioTracks) {
      stream.addTrack(track);
    }
    return stream;
  }, []);

  const startRecording = useCallback(async () => {
    let stream: MediaStream | null = null;

    if (useCompositorRecording) {
      try {
        const compositor = new RecordingCompositor();
        compositorRef.current = compositor;
        await compositor.resumeAudio();
        if (localVideoRef.current) {
          compositor.setMainVideo(localVideoRef.current);
        }
        compositor.syncHostAndScreenAudio(localStreamRef.current, screenStreamRef.current);
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
        setError("Could not start recording. Try a different browser (Chrome recommended).");
        return;
      }
    } else {
      stream = buildRecordingStream();
    }

    if (!stream) return;

    recordingStreamRef.current = stream;
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

      recorder.start(2_000);
      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      setRecordingElapsedSeconds(0);
      setIsRecording(true);
    } catch {
      compositorRef.current?.stop();
      compositorRef.current = null;
      setError("Could not start recording. Try a different browser (Chrome recommended).");
    }
  }, [buildRecordingStream, updateCompositorParticipants, useCompositorRecording]);

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
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        compositorRef.current?.stop();
        compositorRef.current = null;
        if (recordingChunksRef.current.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(recordingChunksRef.current, {
          type: RECORDING_CONTENT_TYPE,
        });
        recordingChunksRef.current = [];
        resolve(blob);
      };

      if (recorder.state === "recording") {
        recorder.requestData();
      }
      recorder.stop();
      recorderRef.current = null;
      setIsRecording(false);
      recordingStartedAtRef.current = null;
      setRecordingElapsedSeconds(0);
    });
  }, []);

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
      if (peerConnectionsRef.current.has(viewerId)) return;

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
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          peerConnectionsRef.current.delete(viewerId);
          connectedViewersRef.current.delete(viewerId);
          removeViewerMedia(viewerId);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal("offer", viewerId, { sdp: offer });
      connectedViewersRef.current.add(viewerId);
    },
    [addLocalTracks, attachRemoteStream, attachViewerStream, isPrivate, mode, removeViewerMedia, resolveIncomingStream, sendSignal],
  );

  const handleHostSignal = useCallback(
    async (signal: MeetingSignalMessage) => {
      if (signal.type === "viewer-ready" && signal.fromUserId !== userId) {
        if (!connectedViewersRef.current.has(signal.fromUserId)) {
          await createHostConnection(signal.fromUserId);
        }
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: preferredDeviceId
          ? {
              deviceId: { exact: preferredDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      attachLocalStream(stream);
      syncVideoDeviceFromStream(stream);
      markLive();
      applyMemberMediaPolicyRef.current();
    } catch {
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        localStreamRef.current = audioOnly;
        attachLocalStream(audioOnly);
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
  }, [attachLocalStream, hostId, isHost, sendSignal, syncVideoDeviceFromStream]);

  const stopAll = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    compositorRef.current?.stop();
    compositorRef.current = null;

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
    setIsLive(false);
  }, []);

  const handleMeetingEnded = useCallback(() => {
    if (meetingEndedRef.current) return;
    meetingEndedRef.current = true;
    stopAll();
    setMeetingEnded(true);
  }, [stopAll]);

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
      if (remoteStream || meetingEndedRef.current) return;
      const pc = peerConnectionsRef.current.get(hostId);
      if (!pc || pc.connectionState === "failed" || pc.connectionState === "closed") {
        void sendSignal("viewer-ready", hostId);
      }
    }, 4000);

    return () => clearInterval(retryInterval);
  }, [hostId, isHost, remoteStream, sendSignal]);

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
  }, []);

  useEffect(() => {
    if (!publishMedia || typeof navigator === "undefined" || !navigator.mediaDevices) return;

    const handleDeviceChange = () => {
      void refreshVideoInputDevices();
    };

    void refreshVideoInputDevices();
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, [publishMedia, refreshVideoInputDevices]);

  useEffect(() => {
    if (!isRecording || !compositorRef.current) return;

    const syncAudio = () => {
      compositorRef.current?.syncHostAndScreenAudio(
        localStreamRef.current,
        screenStreamRef.current,
      );
    };

    syncAudio();
    const interval = window.setInterval(syncAudio, 3000);
    return () => window.clearInterval(interval);
  }, [isRecording]);

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

      for (const pc of peerConnectionsRef.current.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(videoTrack);
        } else if (outboundStream) {
          pc.addTrack(videoTrack, outboundStream);
        }
      }
      await renegotiateAllViewers();
    },
    [renegotiateAllViewers],
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
        if (compositorRef.current && localVideoRef.current) {
          compositorRef.current.setMainVideo(localVideoRef.current);
        }
      } else {
        updateRecordingVideoTrack();
      }

      syncViewerMediaRef.current();
      void refreshVideoInputDevices();
      setError("");
    },
    [
      attachLocalStream,
      isCameraOff,
      isScreenSharing,
      refreshVideoInputDevices,
      replaceVideoOnAllConnections,
      updateRecordingVideoTrack,
    ],
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
    if (compositorRef.current && localVideoRef.current) {
      compositorRef.current.setMainVideo(localVideoRef.current);
      compositorRef.current.syncHostAndScreenAudio(localStreamRef.current, null);
    }
    setIsScreenSharing(false);
  }, [attachLocalStream, replaceVideoOnAllConnections, renegotiateAllViewers]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: true,
      });
      screenStreamRef.current = screenStream;
      attachLocalStream(screenStream);
      await replaceVideoOnAllConnections(screenStream);
      if (compositorRef.current && localVideoRef.current) {
        compositorRef.current.setMainVideo(localVideoRef.current);
        compositorRef.current.syncHostAndScreenAudio(localStreamRef.current, screenStream);
      }
      setIsScreenSharing(true);
      if (isHost) setIsLive(true);

      screenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        void stopScreenShare();
      });
    } catch {
      setError("Could not share screen. Choose a window or tab when prompted, or try Chrome.");
    }
  }, [attachLocalStream, isHost, isScreenSharing, replaceVideoOnAllConnections, stopScreenShare]);

  const endBroadcast = useCallback(async () => {
    if (!isHost) return null;

    setIsSavingRecording(true);
    const wasRecording = isRecording || recorderRef.current?.state === "recording";
    const blob = await stopRecording();

    await sendSignal("host-ended", null);

    let recordingUrl: string | null = null;

    if (blob && blob.size > 0) {
      const filename = buildRecordingFilename(meetingTitle, RECORDING_CONTENT_TYPE);

      try {
        const result = await uploadRecordingBlob(meetingToken, blob, filename);
        recordingUrl = result.publicUrl;
        onRecordingSavedRef.current?.(result.publicUrl);
        setRecordingSaveMessage("saved");
        setError("");
      } catch (uploadError) {
        console.error("Recording upload failed:", uploadError);
        const message =
          uploadError instanceof Error ? uploadError.message : "Upload failed";
        setRecordingSaveMessage("upload-failed");
        setError(
          `Recording could not be saved to the library: ${message}. Check Supabase storage and try again.`,
        );
      }
    } else if (wasRecording) {
      setRecordingSaveMessage("empty");
      setError("");
    } else {
      setRecordingSaveMessage("not-recorded");
      setError("");
    }

    await fetch(`/api/meetings/${meetingToken}/recording`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end", publicUrl: recordingUrl }),
    });

    stopAll();
    setIsSavingRecording(false);
    meetingEndedRef.current = true;
    setMeetingEnded(true);
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
      const pc = peerConnectionsRef.current.get(viewerId);
      if (pc) {
        clearPeerConnection(pc);
        peerConnectionsRef.current.delete(viewerId);
      }
      connectedViewersRef.current.delete(viewerId);
      removeViewerMedia(viewerId);
      void fetchParticipants();
    },
    [fetchParticipants, meetingToken, removeViewerMedia, sendSignal],
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
    isScreenSharing,
    isRecording,
    isSavingRecording,
    recordingElapsedSeconds,
    videoInputDevices,
    selectedVideoDeviceId,
    switchVideoDevice,
    switchFacingMode,
    refreshVideoInputDevices,
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
  };
}
