"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MeetingSignalMessage } from "@/lib/webrtc";

export type MeetingParticipant = {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  handRaised: boolean;
  reaction: string | null;
};

type Options = {
  meetingToken: string;
  userId: string;
  isHost: boolean;
  hostId: string;
  onKicked?: () => void;
  onMeetingEnded?: () => void;
};

/** DB-backed meeting state: participants, hands, reactions, policies, kick/end. */
export function useMeetingPresence({
  meetingToken,
  userId,
  isHost,
  hostId,
  onKicked,
  onMeetingEnded,
}: Options) {
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [handRaised, setHandRaised] = useState(false);
  const [thumbsUp, setThumbsUp] = useState(0);
  const [thumbsDown, setThumbsDown] = useState(0);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [memberVideoEnabled, setMemberVideoEnabled] = useState(true);
  const [memberMicEnabled, setMemberMicEnabled] = useState(true);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [wasRemoved, setWasRemoved] = useState(false);
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const [error, setError] = useState("");

  const signalCursorRef = useRef(new Date().toISOString());
  const meetingEndedRef = useRef(false);
  const kickedRef = useRef(false);
  const wasParticipantRef = useRef(false);
  const onKickedRef = useRef(onKicked);
  const onMeetingEndedRef = useRef(onMeetingEnded);
  onKickedRef.current = onKicked;
  onMeetingEndedRef.current = onMeetingEnded;

  const leaveMeeting = useCallback(async () => {
    try {
      await fetch(`/api/meetings/${meetingToken}/participants`, {
        method: "DELETE",
        keepalive: true,
      });
    } catch {
      /* ignore */
    }
  }, [meetingToken]);

  const handleKicked = useCallback(() => {
    if (kickedRef.current || isHost) return;
    kickedRef.current = true;
    setWasRemoved(true);
    void leaveMeeting();
    onKickedRef.current?.();
  }, [isHost, leaveMeeting]);

  const handleMeetingEnded = useCallback(() => {
    if (meetingEndedRef.current) return;
    meetingEndedRef.current = true;
    setMeetingEnded(true);
    onMeetingEndedRef.current?.();
  }, []);

  const fetchParticipants = useCallback(async () => {
    if (meetingEndedRef.current || kickedRef.current) return;

    const res = await fetch(`/api/meetings/${meetingToken}/participants`);
    if (!res.ok) return;
    const data = await res.json();

    if (data.meetingStatus === "ENDED") {
      handleMeetingEnded();
      return;
    }

    setParticipants(data.participants);
    setThumbsUp(data.thumbsUp ?? 0);
    setThumbsDown(data.thumbsDown ?? 0);

    const me = (data.participants as MeetingParticipant[]).find((p) => p.user.id === userId);
    if (me) {
      wasParticipantRef.current = true;
      setHandRaised(me.handRaised);
      setMyReaction(me.reaction ?? null);
    } else if (
      !isHost &&
      wasParticipantRef.current &&
      data.meetingStatus === "LIVE"
    ) {
      handleKicked();
      return;
    }

    const viewers = (data.participants as MeetingParticipant[]).filter(
      (p) => p.user.id !== data.hostId,
    );
    setViewerCount(viewers.length);
    setMemberVideoEnabled(data.memberVideoEnabled !== false);
    setMemberMicEnabled(data.memberMicEnabled !== false);
  }, [handleKicked, handleMeetingEnded, isHost, meetingToken, userId]);

  const pollSignals = useCallback(async () => {
    if (meetingEndedRef.current || kickedRef.current || isHost) return;

    const res = await fetch(
      `/api/meetings/${meetingToken}/signal?since=${encodeURIComponent(signalCursorRef.current)}`,
    );
    if (!res.ok) return;

    const data = await res.json();
    for (const signal of data.signals as MeetingSignalMessage[]) {
      if (signal.type === "kick" && signal.toUserId === userId) {
        handleKicked();
        return;
      }
      if (signal.type === "host-ended") {
        handleMeetingEnded();
        return;
      }
      if (signal.type === "member-video-policy") {
        setMemberVideoEnabled(signal.payload.enabled !== false);
      }
      if (signal.type === "member-mic-policy") {
        setMemberMicEnabled(signal.payload.enabled !== false);
      }
      signalCursorRef.current = signal.createdAt;
    }
  }, [handleKicked, handleMeetingEnded, isHost, meetingToken, userId]);

  useEffect(() => {
    void fetchParticipants();
    const participantInterval = setInterval(() => void fetchParticipants(), 4000);
    const signalInterval = setInterval(() => void pollSignals(), 1000);
    return () => {
      clearInterval(participantInterval);
      clearInterval(signalInterval);
    };
  }, [fetchParticipants, pollSignals]);

  useEffect(() => {
    if (isHost || kickedRef.current) return;

    const pollNow = () => {
      void pollSignals();
      void fetchParticipants();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") pollNow();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchParticipants, isHost, pollSignals]);

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
      setMemberVideoEnabled(data.memberVideoEnabled !== false);
      setMemberMicEnabled(data.memberMicEnabled !== false);
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

  const kickViewer = useCallback(
    async (viewerId: string) => {
      await fetch(`/api/meetings/${meetingToken}/chat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: viewerId, action: "remove" }),
      });
      try {
        await fetch(`/api/meetings/${meetingToken}/livekit-participant`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: viewerId }),
        });
      } catch {
        /* ignore */
      }
      void fetchParticipants();
    },
    [fetchParticipants, meetingToken],
  );

  const endBroadcast = useCallback(async () => {
    if (!isHost || meetingEndedRef.current) return;
    setIsSavingRecording(true);
    try {
      await fetch(`/api/meetings/${meetingToken}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "host-ended", toUserId: null, payload: {} }),
      });
      await fetch(`/api/meetings/${meetingToken}/recording`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end", publicUrl: null }),
      });
    } catch {
      setError("Could not end livestream.");
    } finally {
      setIsSavingRecording(false);
      handleMeetingEnded();
    }
  }, [handleMeetingEnded, isHost, meetingToken]);

  return {
    participants,
    viewerCount,
    handRaised,
    thumbsUp,
    thumbsDown,
    myReaction,
    memberVideoEnabled,
    memberMicEnabled,
    meetingEnded,
    wasRemoved,
    isSavingRecording,
    error,
    setError,
    toggleHand,
    sendReaction,
    toggleMemberVideo,
    toggleMemberMic,
    kickViewer,
    leaveMeeting,
    endBroadcast,
    fetchParticipants,
  };
}
