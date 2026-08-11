export type SignalType =
  | "viewer-ready"
  | "viewer-left"
  | "offer"
  | "answer"
  | "ice"
  | "kick"
  | "host-ended"
  | "screen-share"
  | "promote-speaker"
  | "revoke-speaker"
  | "member-video-policy"
  | "member-mic-policy";

export type SignalPayload = {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  enabled?: boolean;
  active?: boolean;
};

export type MeetingSignalMessage = {
  id: string;
  fromUserId: string;
  toUserId: string | null;
  type: SignalType;
  payload: SignalPayload;
  createdAt: string;
};
