export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export type SignalType =
  | "viewer-ready"
  | "offer"
  | "answer"
  | "ice"
  | "kick"
  | "host-ended"
  | "promote-speaker"
  | "revoke-speaker";

export type SignalPayload = {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export type MeetingSignalMessage = {
  id: string;
  fromUserId: string;
  toUserId: string | null;
  type: SignalType;
  payload: SignalPayload;
  createdAt: string;
};

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}
