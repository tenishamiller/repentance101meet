"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addIceCandidateSafe,
  bindStreamToVideo,
  clearPeerConnection,
  isScreenShareTrack,
  partitionRemoteVideoTracks,
  setRemoteDescriptionSafe,
} from "@/lib/media-video";
import {
  createPeerConnection,
  type MeetingSignalMessage,
  type SignalPayload,
} from "@/lib/webrtc";
import {
  listAudioInputDevices,
  listVideoInputDevices,
  loadPreferredAudioDeviceId,
  loadPreferredCameraDeviceId,
  savePreferredAudioDeviceId,
  savePreferredCameraDeviceId,
  trackIsActive,
} from "@/lib/media-devices";
import type { GalleryMember } from "@/hooks/livestream-types";

export type { GalleryMember };

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
  onKicked?: () => void;
  onMeetingEnded?: () => void;
};

export function useLivestream({
  meetingToken,
  userId,
  isHost,
  hostId,
  onKicked,
  onMeetingEnded,
}: UseLivestreamOptions) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteHostCameraVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const viewerDisconnectTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const signalCursorRef = useRef(new Date().toISOString());
  const connectedViewersRef = useRef<Set<string>>(new Set());
  const viewerStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const syncViewerMediaRef = useRef<() => void>(() => {});

  const [viewerMedia, setViewerMedia] = useState<ViewerMedia[]>([]);

  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isRemoteCameraOff, setIsRemoteCameraOff] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState("");
  const [handRaised, setHandRaised] = useState(false);
  const [thumbsUp, setThumbsUp] = useState(0);
  const [thumbsDown, setThumbsDown] = useState(0);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [memberVideoEnabled, setMemberVideoEnabled] = useState(true);
  const [memberMicEnabled, setMemberMicEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("");
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);

  const selectedVideoDeviceIdRef = useRef("");
  const selectedAudioDeviceIdRef = useRef("");
  const facingModeRef = useRef<"user" | "environment">("user");

  const memberVideoEnabledRef = useRef(true);
  const memberMicEnabledRef = useRef(true);
  const isScreenSharingRef = useRef(false);
  const isCameraOffRef = useRef(false);
  const isMutedRef = useRef(false);
  const hostConnectStartedRef = useRef<number | null>(null);
  const viewerConnectStartedRef = useRef<Map<string, number>>(new Map());
  const applyMemberMediaPolicyRef = useRef<() => void>(() => {});
  const applyHostMemberMediaPolicyRef = useRef<() => void>(() => {});

  const meetingEndedRef = useRef(false);
  const hasLeftRef = useRef(false);
  const endingBroadcastRef = useRef(false);
  const endBroadcastRef = useRef<() => Promise<string | null>>(async () => null);
  const stopAllRef = useRef<() => void>(() => {});
  const handleMeetingEndedRef = useRef<() => void>(() => {});

  const onKickedRef = useRef(onKicked);
  const onMeetingEndedRef = useRef(onMeetingEnded);
  onKickedRef.current = onKicked;
  onMeetingEndedRef.current = onMeetingEnded;

  const viewerAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const hostPcRef = useRef<RTCPeerConnection | null>(null);
  const hostScreenSharingRef = useRef(false);
  const bindRemoteMediaRef = useRef<() => void>(() => {});

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
    for (const [viewerUserId, stream] of viewerStreamsRef.current) {
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      items.push({
        userId: viewerUserId,
        stream,
        cameraOn: trackIsActive(videoTrack),
        micOn: trackIsActive(audioTrack),
      });
    }
    setViewerMedia(items);
  }, []);

  syncViewerMediaRef.current = syncViewerMedia;

  const removeViewerMedia = useCallback((viewerId: string) => {
    viewerStreamsRef.current.delete(viewerId);

    const audio = viewerAudioRefs.current.get(viewerId);
    if (audio) {
      audio.srcObject = null;
      viewerAudioRefs.current.delete(viewerId);
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
      track.enabled = videoAllowed ? !isCameraOffRef.current : false;
    }
    for (const track of stream.getAudioTracks()) {
      track.enabled = micAllowed ? !isMutedRef.current : false;
    }

    if (!videoAllowed) {
      setIsCameraOff(true);
    }
    if (!micAllowed) {
      setIsMuted(true);
    }
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
          handRaised: p.handRaised,
          reaction: p.reaction,
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

  const bindRemoteMedia = useCallback(() => {
    const pc = hostPcRef.current;
    let stream = remoteStreamRef.current ?? new MediaStream();

    if (pc) {
      for (const receiver of pc.getReceivers()) {
        const track = receiver.track;
        if (!track || track.readyState === "ended") continue;
        if (!stream.getTracks().some((existing) => existing.id === track.id)) {
          stream.addTrack(track);
        }
      }

      for (const track of [...stream.getTracks()]) {
        const stillPresent = pc.getReceivers().some((receiver) => receiver.track?.id === track.id);
        if (!stillPresent || track.readyState === "ended") {
          stream.removeTrack(track);
        }
      }
    }

    remoteStreamRef.current = stream;
    setRemoteStream(new MediaStream(stream.getTracks()));

    const audioTrack = stream.getAudioTracks().find((track) => track.readyState === "live");
    setIsRemoteMuted(!trackIsActive(audioTrack));

    const receiverTracks = pc
      ? pc
          .getReceivers()
          .map((receiver) => receiver.track)
          .filter((track): track is MediaStreamTrack => !!track && track.readyState === "live")
      : stream.getTracks().filter((track) => track.readyState === "live");

    const { screen, camera } = partitionRemoteVideoTracks(
      receiverTracks,
      hostScreenSharingRef.current,
    );

    if (screen && hostScreenSharingRef.current) {
      setIsRemoteScreenSharing(true);
      void bindStreamToVideo(remoteVideoRef.current, new MediaStream([screen]));
      if (camera) {
        void bindStreamToVideo(remoteHostCameraVideoRef.current, new MediaStream([camera]));
        setIsRemoteCameraOff(!trackIsActive(camera));
      } else {
        void bindStreamToVideo(remoteHostCameraVideoRef.current, null);
        setIsRemoteCameraOff(true);
      }
    } else {
      setIsRemoteScreenSharing(false);
      void bindStreamToVideo(remoteHostCameraVideoRef.current, null);
      const primary = camera ?? receiverTracks.find((track) => track.kind === "video") ?? null;
      if (primary) {
        void bindStreamToVideo(remoteVideoRef.current, new MediaStream([primary]));
        setIsRemoteCameraOff(!trackIsActive(primary));
      } else {
        void bindStreamToVideo(
          remoteVideoRef.current,
          stream.getVideoTracks().some((track) => track.readyState === "live") ? stream : null,
        );
        setIsRemoteCameraOff(true);
      }
    }

    for (const track of receiverTracks) {
      track.onended = () => bindRemoteMediaRef.current();
      track.onmute = () => bindRemoteMediaRef.current();
      track.onunmute = () => bindRemoteMediaRef.current();
    }

    setIsLive(true);
  }, []);

  bindRemoteMediaRef.current = bindRemoteMedia;

  const refreshRemoteStreamFromReceivers = useCallback(
    (hostPc: RTCPeerConnection) => {
      hostPcRef.current = hostPc;
      bindRemoteMedia();
    },
    [bindRemoteMedia],
  );

  const attachRemoteStream = useCallback(
    (stream: MediaStream) => {
      remoteStreamRef.current = stream;
      bindRemoteMedia();
    },
    [bindRemoteMedia],
  );

  const attachLocalStream = useCallback((stream: MediaStream) => {
    setLocalStream(stream);
    void bindStreamToVideo(localVideoRef.current, stream);
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

  const removeParticipantFromList = useCallback(
    (viewerId: string) => {
      setParticipants((prev) => {
        const next = prev.filter((p) => p.user.id !== viewerId);
        setViewerCount(next.filter((p) => p.user.id !== hostId).length);
        return next;
      });
    },
    [hostId],
  );

  const removeViewerFromMeeting = useCallback(
    async (viewerId: string) => {
      teardownViewerConnection(viewerId);
      removeParticipantFromList(viewerId);

      if (!isHost || viewerId === hostId) return;

      try {
        await fetch(`/api/meetings/${meetingToken}/participants`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: viewerId }),
        });
      } catch {
        /* ignore */
      }
    },
    [hostId, isHost, meetingToken, removeParticipantFromList, teardownViewerConnection],
  );

  const leaveMeeting = useCallback(async () => {
    if (hasLeftRef.current || meetingEndedRef.current || isHost) return;
    hasLeftRef.current = true;

    try {
      await sendSignal("viewer-left", hostId);
    } catch {
      /* ignore */
    }

    try {
      await fetch(`/api/meetings/${meetingToken}/participants`, {
        method: "DELETE",
        keepalive: true,
      });
    } catch {
      /* ignore */
    }
  }, [hostId, isHost, meetingToken, sendSignal]);

  const leaveMeetingRef = useRef(leaveMeeting);
  leaveMeetingRef.current = leaveMeeting;

  const addLocalTracks = useCallback((pc: RTCPeerConnection) => {
    const baseStream = localStreamRef.current;
    const outboundStream = baseStream ?? screenStreamRef.current;
    if (!outboundStream) return;

    const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
    const cameraTrack = baseStream?.getVideoTracks()[0];
    const audioTrack = baseStream?.getAudioTracks()[0];

    if (screenTrack && cameraTrack) {
      if (!pc.getSenders().some((sender) => sender.track === screenTrack)) {
        pc.addTrack(screenTrack, outboundStream);
      }
      if (!pc.getSenders().some((sender) => sender.track === cameraTrack)) {
        pc.addTrack(cameraTrack, outboundStream);
      }
    } else {
      const videoTrack = screenTrack ?? cameraTrack;
      if (videoTrack && !pc.getSenders().some((sender) => sender.track === videoTrack)) {
        pc.addTrack(videoTrack, outboundStream);
      }
    }

    if (audioTrack && !pc.getSenders().some((sender) => sender.track === audioTrack)) {
      pc.addTrack(audioTrack, outboundStream);
    }
  }, []);

  const syncHostVideoToAllViewers = useCallback(async () => {
    if (!isHost) return;

    const screenTrack = screenStreamRef.current?.getVideoTracks()[0] ?? null;
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] ?? null;
    const audioTrack = localStreamRef.current?.getAudioTracks()[0] ?? null;
    const outboundStream = localStreamRef.current ?? screenStreamRef.current;

    for (const viewerId of [...connectedViewersRef.current]) {
      const pc = peerConnectionsRef.current.get(viewerId);
      if (!pc) continue;

      let needsRenegotiation = false;
      const senders = pc.getSenders();
      const videoSenders = senders.filter((sender) => sender.track?.kind === "video");
      const audioSender = senders.find((sender) => sender.track?.kind === "audio");

      if (screenTrack && cameraTrack) {
        if (videoSenders[0]) {
          await videoSenders[0].replaceTrack(screenTrack);
        } else if (outboundStream) {
          pc.addTrack(screenTrack, outboundStream);
          needsRenegotiation = true;
        }

        if (videoSenders[1]) {
          await videoSenders[1].replaceTrack(cameraTrack);
        } else if (outboundStream) {
          pc.addTrack(cameraTrack, outboundStream);
          needsRenegotiation = true;
        }

        for (let index = 2; index < videoSenders.length; index += 1) {
          pc.removeTrack(videoSenders[index]!);
          needsRenegotiation = true;
        }
      } else {
        const primaryVideo = screenTrack ?? cameraTrack;
        if (primaryVideo) {
          if (videoSenders[0]) {
            await videoSenders[0].replaceTrack(primaryVideo);
          } else if (outboundStream) {
            pc.addTrack(primaryVideo, outboundStream);
            needsRenegotiation = true;
          }
        } else if (videoSenders[0]) {
          await videoSenders[0].replaceTrack(null);
        }

        for (let index = 1; index < videoSenders.length; index += 1) {
          pc.removeTrack(videoSenders[index]!);
          needsRenegotiation = true;
        }
      }

      if (audioTrack) {
        if (audioSender) {
          await audioSender.replaceTrack(audioTrack);
        } else if (outboundStream) {
          pc.addTrack(audioTrack, outboundStream);
          needsRenegotiation = true;
        }
      }

      if (needsRenegotiation) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal("offer", viewerId, { sdp: offer });
      }
    }
  }, [isHost, sendSignal]);

  const createHostConnection = useCallback(
    async (viewerId: string) => {
      const existing = peerConnectionsRef.current.get(viewerId);
      if (existing?.connectionState === "connected") {
        return;
      }

      if (existing?.connectionState === "connecting") {
        const started = viewerConnectStartedRef.current.get(viewerId) ?? Date.now();
        if (Date.now() - started < 15_000) {
          return;
        }
        teardownViewerConnection(viewerId);
      } else if (existing) {
        teardownViewerConnection(viewerId);
      }

      viewerConnectStartedRef.current.set(viewerId, Date.now());

      const pc = createPeerConnection();
      peerConnectionsRef.current.set(viewerId, pc);
      addLocalTracks(pc);

      pc.ontrack = (event) => {
        const stream = resolveIncomingStream(
          event,
          viewerStreamsRef.current.get(viewerId) ?? null,
        );
        if (!stream) return;

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
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal("ice", viewerId, { candidate: event.candidate.toJSON() });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          clearViewerDisconnectTimer(viewerId);
          viewerConnectStartedRef.current.delete(viewerId);
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
              void removeViewerFromMeeting(viewerId);
            }
          }, 2500);
          viewerDisconnectTimersRef.current.set(viewerId, timer);
          return;
        }

        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          void removeViewerFromMeeting(viewerId);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal("offer", viewerId, { sdp: offer });
      connectedViewersRef.current.add(viewerId);

      if (isScreenSharingRef.current) {
        await sendSignal("screen-share", viewerId, { active: true });
      }
    },
    [
      addLocalTracks,
      attachViewerStream,
      clearViewerDisconnectTimer,
      removeViewerFromMeeting,
      resolveIncomingStream,
      sendSignal,
      teardownViewerConnection,
    ],
  );

  const handleHostSignal = useCallback(
    async (signal: MeetingSignalMessage) => {
      if (signal.type === "viewer-left" && signal.fromUserId !== userId) {
        teardownViewerConnection(signal.fromUserId);
        removeParticipantFromList(signal.fromUserId);
        return;
      }

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
    [createHostConnection, removeParticipantFromList, teardownViewerConnection, userId],
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

      if (signal.type === "screen-share" && signal.fromUserId === hostId) {
        hostScreenSharingRef.current = signal.payload.active === true;
        const pc = peerConnectionsRef.current.get(hostId);
        if (pc) {
          refreshRemoteStreamFromReceivers(pc);
        } else {
          setIsRemoteScreenSharing(hostScreenSharingRef.current);
        }
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
          const hostPc = createPeerConnection();
          peerConnectionsRef.current.set(hostId, hostPc);
          hostConnectStartedRef.current = Date.now();
          addLocalTracks(hostPc);

          hostPc.ontrack = () => {
            refreshRemoteStreamFromReceivers(hostPc);
          };

          hostPc.onicecandidate = (event) => {
            if (event.candidate) {
              void sendSignal("ice", hostId, { candidate: event.candidate.toJSON() });
            }
          };

          hostPc.onconnectionstatechange = () => {
            if (hostPc.connectionState === "connected") {
              hostConnectStartedRef.current = null;
              return;
            }

            const requestReconnect = () => {
              const current = peerConnectionsRef.current.get(hostId);
              if (current !== hostPc) return;
              clearPeerConnection(hostPc);
              peerConnectionsRef.current.delete(hostId);
              remoteStreamRef.current = null;
              setRemoteStream(null);
              setIsRemoteCameraOff(true);
              setIsLive(false);
              void sendSignal("viewer-ready", hostId);
            };

            if (hostPc.connectionState === "disconnected") {
              window.setTimeout(() => {
                if (
                  hostPc.connectionState === "disconnected" ||
                  hostPc.connectionState === "failed" ||
                  hostPc.connectionState === "closed"
                ) {
                  requestReconnect();
                }
              }, 2500);
              return;
            }

            if (hostPc.connectionState === "failed" || hostPc.connectionState === "closed") {
              requestReconnect();
            }
          };

          pc = hostPc;
        } else {
          pc.ontrack = () => {
            refreshRemoteStreamFromReceivers(pc!);
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
    [addLocalTracks, attachRemoteStream, hostId, refreshRemoteStreamFromReceivers, resolveIncomingStream, sendSignal, userId],
  );

  const pollSignals = useCallback(async () => {
    if (meetingEndedRef.current) return;

    const res = await fetch(
      `/api/meetings/${meetingToken}/signal?since=${encodeURIComponent(signalCursorRef.current)}`,
    );
    if (!res.ok) return;

    const data = await res.json();
    for (const signal of data.signals as MeetingSignalMessage[]) {
      try {
        if (isHost) {
          await handleHostSignal(signal);
        } else {
          await handleViewerSignal(signal);
        }
        signalCursorRef.current = signal.createdAt;
      } catch (err) {
        console.error("Signal handling failed:", signal.type, err);
        break;
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

    if (isHost) {
      const participantIds = new Set(
        (data.participants as Participant[]).map((p) => p.user.id),
      );
      for (const viewerId of peerConnectionsRef.current.keys()) {
        if (!participantIds.has(viewerId)) {
          teardownViewerConnection(viewerId);
        }
      }
    }

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
  }, [isHost, meetingToken, teardownViewerConnection, userId]);

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
    viewerStreamsRef.current.clear();
    setViewerMedia([]);

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIsRemoteCameraOff(false);
    setIsRemoteMuted(false);
    hostPcRef.current = null;
    hostScreenSharingRef.current = false;
    setIsRemoteScreenSharing(false);
    setIsLive(false);
  }, []);

  const handleMeetingEnded = useCallback(() => {
    if (meetingEndedRef.current || endingBroadcastRef.current) return;

    meetingEndedRef.current = true;
    stopAll();
    setMeetingEnded(true);
  }, [stopAll]);

  stopAllRef.current = stopAll;
  handleMeetingEndedRef.current = handleMeetingEnded;

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      await startBroadcast();

      if (!cancelled && !isHost) {
        await sendSignal("viewer-ready", hostId);
      }
    }

    void connect();

    return () => {
      cancelled = true;
      if (!isHost) {
        void leaveMeetingRef.current();
      }
      stopAll();
    };
  }, [hostId, isHost, meetingToken, sendSignal, startBroadcast, stopAll]);

  useEffect(() => {
    if (isHost) return;

    function onPageHide() {
      if (!hasLeftRef.current && !meetingEndedRef.current) {
        void leaveMeetingRef.current();
      }
    }

    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [isHost]);

  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  useEffect(() => {
    isCameraOffRef.current = isCameraOff;
    if (!isHost && memberVideoEnabledRef.current && localStreamRef.current) {
      for (const track of localStreamRef.current.getVideoTracks()) {
        track.enabled = !isCameraOff;
      }
    }
  }, [isCameraOff, isHost]);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (!isHost && memberMicEnabledRef.current && localStreamRef.current) {
      for (const track of localStreamRef.current.getAudioTracks()) {
        track.enabled = !isMuted;
      }
    }
  }, [isMuted, isHost]);

  useEffect(() => {
    if (isScreenSharingRef.current) return;
    if (isCameraOff || (!isHost && !memberVideoEnabledRef.current)) {
      void bindStreamToVideo(localVideoRef.current, null);
      return;
    }
    void bindStreamToVideo(localVideoRef.current, localStream);
  }, [isCameraOff, isHost, localStream]);

  useEffect(() => {
    if (isHost) return;

    const retryInterval = setInterval(() => {
      if (meetingEndedRef.current) return;

      const pc = peerConnectionsRef.current.get(hostId);
      if (pc?.connectionState === "connected") return;

      const connectingTooLong =
        pc?.connectionState === "connecting" &&
        hostConnectStartedRef.current !== null &&
        Date.now() - hostConnectStartedRef.current > 20_000;

      if (pc?.connectionState === "connecting" && !connectingTooLong) return;

      const hasLiveHostVideo = pc
        ?.getReceivers()
        .some(
          (receiver) =>
            receiver.track?.kind === "video" && receiver.track.readyState === "live",
        );
      if (hasLiveHostVideo) return;

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
    if (!isHost) return;
    const mediaInterval = setInterval(() => syncViewerMediaRef.current(), 1500);
    return () => clearInterval(mediaInterval);
  }, [isHost]);

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
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;

    const handleDeviceChange = () => {
      void refreshMediaInputDevices();
    };

    void refreshMediaInputDevices();
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, [refreshMediaInputDevices]);

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
    const turningOff = !isCameraOffRef.current;
    isCameraOffRef.current = turningOff;
    setIsCameraOff(turningOff);
    syncViewerMediaRef.current();
    if (!isHost) {
      void bindStreamToVideo(localVideoRef.current, turningOff ? null : stream);
    }
    if (isScreenSharing) {
      void syncHostVideoToAllViewers();
    }
    setError("");
  }, [isHost, isScreenSharing, syncHostVideoToAllViewers]);

  const replaceVideoOnAllConnections = useCallback(
    async (newStream: MediaStream) => {
      const cameraTrack = newStream.getVideoTracks()[0];
      if (!cameraTrack) return;

      if (isScreenSharingRef.current) {
        await syncHostVideoToAllViewers();
        return;
      }

      const outboundStream = localStreamRef.current ?? newStream;

      for (const [viewerId, pc] of peerConnectionsRef.current.entries()) {
        try {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(cameraTrack);
          } else if (outboundStream) {
            pc.addTrack(cameraTrack, outboundStream);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendSignal("offer", viewerId, { sdp: offer });
          }
        } catch (error) {
          console.error("Failed to update video track for viewer", viewerId, error);
        }
      }
    },
    [sendSignal, syncHostVideoToAllViewers],
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
      } else {
        await syncHostVideoToAllViewers();
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
      syncHostVideoToAllViewers,
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
      await syncHostVideoToAllViewers();
    } else {
      await syncHostVideoToAllViewers();
    }
    await sendSignal("screen-share", null, { active: false });
    setIsScreenSharing(false);
  }, [attachLocalStream, sendSignal, syncHostVideoToAllViewers]);

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

      try {
        videoTrack.contentHint = "detail";
      } catch {
        /* contentHint unsupported in some browsers */
      }

      screenStreamRef.current = screenStream;
      void bindStreamToVideo(localVideoRef.current, screenStream);
      await sendSignal("screen-share", null, { active: true });
      await syncHostVideoToAllViewers();

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
    sendSignal,
    stopScreenShare,
    syncHostVideoToAllViewers,
  ]);

  const endBroadcast = useCallback(async () => {
    if (!isHost || meetingEndedRef.current || endingBroadcastRef.current) return null;

    endingBroadcastRef.current = true;
    setIsSavingRecording(true);

    try {
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

    setError("");
    return null;
  }, [isHost, meetingToken, sendSignal, stopAll]);

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
      try {
        await fetch(`/api/meetings/${meetingToken}/livekit-participant`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: viewerId }),
        });
      } catch {
        /* ignore */
      }
      await fetch(`/api/meetings/${meetingToken}/chat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: viewerId, action: "remove" }),
      });
      teardownViewerConnection(viewerId);
      void fetchParticipants();
    },
    [fetchParticipants, meetingToken, teardownViewerConnection],
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
    remoteHostCameraVideoRef,
    isLive,
    isMuted,
    isCameraOff,
    isRemoteCameraOff,
    isRemoteMuted,
    isRemoteScreenSharing,
    isScreenSharing,
    localStream,
    remoteStream,
    isSavingRecording,
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
    endBroadcast,
    toggleHand,
    sendReaction,
    kickViewer,
    leaveMeeting,
    meetingEnded,
  };
}
