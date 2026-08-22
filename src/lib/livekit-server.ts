import "server-only";

import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";

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
  return (
    process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() ||
    process.env.LIVEKIT_URL?.trim() ||
    ""
  );
}

/** Throws when LiveKit project credentials are rejected by the cloud API. */
export async function assertLiveKitCredentials(config: LiveKitConfig) {
  const host = config.url.replace(/^wss:\/\//, "https://");
  const client = new RoomServiceClient(host, config.apiKey, config.apiSecret);
  await client.listRooms();
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
  avatarUrl?: string | null;
  isHost: boolean;
  memberVideoEnabled?: boolean;
  memberMicEnabled?: boolean;
  /** Private 1-on-1: both participants need full publish (camera + mic). */
  roomKind?: "livestream" | "private";
};

function memberPublishSources(memberVideoEnabled: boolean, memberMicEnabled: boolean) {
  const sources: TrackSource[] = [];
  if (memberVideoEnabled) sources.push(TrackSource.CAMERA);
  if (memberMicEnabled) sources.push(TrackSource.MICROPHONE);
  return sources;
}

export async function createLiveKitAccessToken(options: CreateTokenOptions) {
  const config = getLiveKitConfig();
  if (!config) {
    throw new Error("LiveKit is not configured");
  }

  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: options.identity,
    name: options.name,
    ttl: "6h",
    metadata: JSON.stringify({
      avatarUrl: options.avatarUrl ?? "",
    }),
  });

  if (options.isHost || options.roomKind === "private") {
    token.addGrant({
      roomJoin: true,
      room: options.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: options.isHost === true,
    });
  } else {
    const sources = memberPublishSources(
      options.memberVideoEnabled !== false,
      options.memberMicEnabled !== false,
    );
    token.addGrant({
      roomJoin: true,
      room: options.roomName,
      canPublish: sources.length > 0,
      canPublishSources: sources.length > 0 ? sources : undefined,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: false,
    });
  }

  return await token.toJwt();
}
