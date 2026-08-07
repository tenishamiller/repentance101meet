"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPeerConnection,
  type MeetingSignalMessage,
  type SignalPayload,
} from "@/lib/webrtc";
import {
  buildRecordingFilename,
  getRecordingMimeType,
  triggerBrowserDownload,
  uploadRecordingBlob,
} from "@/lib/recording";

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
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalCursorRef = useRef<string>(new Date(0).toISOString());
  const connectedViewersRef = useRef<Set<string>>(new Set());
  const viewerAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

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

  const onKickedRef = useRef(onKicked);
  const onMeetingEndedRef = useRef(onMeetingEnded);
  const onRecordingSavedRef = useRef(onRecordingSaved);
  onKickedRef.current = onKicked;
  onMeetingEndedRef.current = onMeetingEnded;
  onRecordingSavedRef.current = onRecordingSaved;

  const attachRemoteStream = useCallback((stream: MediaStream) => {
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== stream) {
      remoteVideoRef.current.srcObject = stream;
    }
    setIsLive(true);
  }, []);

  const attachLocalStream = useCallback((stream: MediaStream) => {
    if (localVideoRef.current && localVideoRef.current.srcObject !== stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, []);

  const buildRecordingStream = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    const videoTrack =
      screenStreamRef.current?.getVideoTracks()[0] ??
      localStreamRef.current?.getVideoTracks()[0];
    if (!videoTrack && !audioTrack) return null;

    const stream = new MediaStream();
    if (videoTrack) stream.addTrack(videoTrack);
    if (audioTrack) stream.addTrack(audioTrack);
    return stream;
  }, []);

  const startRecording = useCallback(() => {
    const stream = buildRecordingStream();
    if (!stream) return;

    recordingStreamRef.current = stream;
    recordingMimeRef.current = getRecordingMimeType();
    recordingChunksRef.current = [];

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType: recordingMimeRef.current,
        videoBitsPerSecond: 2_500_000,
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.start(10_000);
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setError("Could not start recording. Try a different browser (Chrome recommended).");
    }
  }, [buildRecordingStream]);

  const beginRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") return;
    startRecording();
  }, [startRecording]);

  const updateRecordingVideoTrack = useCallback(() => {
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
        if (recordingChunksRef.current.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(recordingChunksRef.current, {
          type: recordingMimeRef.current,
        });
        recordingChunksRef.current = [];
        resolve(blob);
      };

      recorder.stop();
      recorderRef.current = null;
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
    const stream = screenStreamRef.current ?? localStreamRef.current;
    if (!stream) return;
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
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
          const [stream] = event.streams;
          if (!stream) return;

          if (isPrivate && remoteVideoRef.current) {
            attachRemoteStream(stream);
            return;
          }

          if (mode === "livestream") {
            let audio = viewerAudioRefs.current.get(viewerId);
            if (!audio) {
              audio = document.createElement("audio");
              audio.autoplay = true;
              viewerAudioRefs.current.set(viewerId, audio);
            }
            audio.srcObject = stream;
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
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal("offer", viewerId, { sdp: offer });
      connectedViewersRef.current.add(viewerId);
    },
    [addLocalTracks, attachRemoteStream, isPrivate, mode, sendSignal],
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
          await pc.setRemoteDescription(signal.payload.sdp);
        }
        return;
      }

      if (signal.type === "ice") {
        const pc = peerConnectionsRef.current.get(signal.fromUserId);
        if (pc && signal.payload.candidate) {
          await pc.addIceCandidate(signal.payload.candidate);
        }
      }
    },
    [createHostConnection, userId],
  );

  const handleViewerSignal = useCallback(
    async (signal: MeetingSignalMessage) => {
      if (signal.type === "kick" && signal.toUserId === userId) {
        onKickedRef.current?.();
        return;
      }

      if (signal.type === "host-ended") {
        onMeetingEndedRef.current?.();
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
            const [stream] = event.streams;
            if (stream) {
              attachRemoteStream(stream);
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              void sendSignal("ice", hostId, { candidate: event.candidate.toJSON() });
            }
          };
        }

        if (signal.payload.sdp) {
          await pc.setRemoteDescription(signal.payload.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal("answer", hostId, { sdp: answer });
        }
        return;
      }

      if (signal.type === "ice" && signal.fromUserId === hostId) {
        const pc = peerConnectionsRef.current.get(hostId);
        if (pc && signal.payload.candidate) {
          await pc.addIceCandidate(signal.payload.candidate);
        }
      }
    },
    [addLocalTracks, attachRemoteStream, hostId, isPrivate, mode, sendSignal, userId],
  );

  const pollSignals = useCallback(async () => {
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
    const res = await fetch(`/api/meetings/${meetingToken}/participants`);
    if (!res.ok) return;
    const data = await res.json();
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
  }, [meetingToken, userId]);

  const startBroadcast = useCallback(async () => {
    const existing = localStreamRef.current;
    if (existing?.active) {
      attachLocalStream(existing);
      setIsLive(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      attachLocalStream(stream);
      setIsLive(true);
    } catch {
      setError("Camera or microphone access was denied. Please allow access and reload.");
    }
  }, [attachLocalStream]);

  const stopAll = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    for (const pc of peerConnectionsRef.current.values()) {
      pc.close();
    }
    peerConnectionsRef.current.clear();
    connectedViewersRef.current.clear();
    viewerAudioRefs.current.forEach((a) => {
      a.srcObject = null;
    });
    viewerAudioRefs.current.clear();

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    recordingStreamRef.current = null;
  }, []);

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

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    for (const track of stream.getAudioTracks()) {
      track.enabled = !track.enabled;
    }
    setIsMuted((m) => !m);
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    for (const track of stream.getVideoTracks()) {
      track.enabled = !track.enabled;
    }
    setIsCameraOff((c) => !c);
    if (!isScreenSharing) {
      updateRecordingVideoTrack();
    }
  }, [isScreenSharing, updateRecordingVideoTrack]);

  const replaceVideoOnAllConnections = useCallback(async (newStream: MediaStream) => {
    const videoTrack = newStream.getVideoTracks()[0];
    if (!videoTrack) return;

    for (const pc of peerConnectionsRef.current.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(videoTrack);
      }
    }
    updateRecordingVideoTrack();
  }, [updateRecordingVideoTrack]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      if (localStreamRef.current) {
        attachLocalStream(localStreamRef.current);
        await replaceVideoOnAllConnections(localStreamRef.current);
      }
      setIsScreenSharing(false);
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = screenStream;
      attachLocalStream(screenStream);
      await replaceVideoOnAllConnections(screenStream);
      setIsScreenSharing(true);

      screenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        void toggleScreenShare();
      });
    } catch {
      /* user cancelled screen share picker */
    }
  }, [attachLocalStream, isScreenSharing, replaceVideoOnAllConnections]);

  const endBroadcast = useCallback(async () => {
    if (!isHost) return null;

    setIsSavingRecording(true);
    const blob = await stopRecording();

    await sendSignal("host-ended", null);

    let recordingUrl: string | null = null;

    if (blob && blob.size > 0) {
      const filename = buildRecordingFilename(meetingTitle, blob.type);
      triggerBrowserDownload(blob, filename);

      try {
        const result = await uploadRecordingBlob(meetingToken, blob, filename);
        recordingUrl = result.publicUrl;
        onRecordingSavedRef.current?.(result.publicUrl);
      } catch {
        setError(
          "Recording downloaded to your device. Cloud upload failed — try again from Admin or check Supabase storage.",
        );
      }
    }

    await fetch(`/api/meetings/${meetingToken}/recording`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end", publicUrl: recordingUrl }),
    });

    stopAll();
    setIsSavingRecording(false);
    return recordingUrl;
  }, [
    isHost,
    meetingTitle,
    meetingToken,
    sendSignal,
    stopAll,
    stopRecording,
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
      peerConnectionsRef.current.get(viewerId)?.close();
      peerConnectionsRef.current.delete(viewerId);
      connectedViewersRef.current.delete(viewerId);
      void fetchParticipants();
    },
    [fetchParticipants, meetingToken, sendSignal],
  );

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
    participants,
    viewerCount,
    error,
    handRaised,
    thumbsUp,
    thumbsDown,
    myReaction,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    beginRecording,
    endBroadcast,
    toggleHand,
    sendReaction,
    kickViewer,
  };
}
