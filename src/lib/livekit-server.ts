import { AccessToken } from "livekit-server-sdk";

export type LiveKitConfig = {
  url: string;
  apiKey: string;
  apiSecret: string;
};

export function getLiveKitConfig(): LiveKitConfig | null {
  const url = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

export function getPublicLiveKitUrl() {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() || process.env.LIVEKIT_URL?.trim() || "";
}

export function liveKitRoomName(
  meetingToken: string,
  kind: "livestream" | "private" = "livestream",
) {
  return `${kind}-${meetingToken}`;
}

type CreateTokenOptions = {
  roomName: string;
  identity: string;
  name: string;
  isHost: boolean;
  memberCanPublish?: boolean;
};

export async function createLiveKitAccessToken(options: CreateTokenOptions) {
  const config = getLiveKitConfig();
  if (!config) {
    throw new Error("LiveKit is not configured");
  }

  const canPublish = options.isHost || (options.memberCanPublish ?? true);

  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: options.identity,
    name: options.name,
    ttl: "6h",
  });

  token.addGrant({
    roomJoin: true,
    room: options.roomName,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: options.isHost,
  });

  return await token.toJwt();
}
