import "server-only";

import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import { unquoteEnv } from "@/lib/env";
import { normalizeLiveKitUrl } from "@/lib/livekit-url";

export type LiveKitConfig = {
  url: string;
  apiKey: string;
  apiSecret: string;
};

export function getLiveKitConfig(): LiveKitConfig | null {
  const url =
    normalizeLiveKitUrl(process.env.LIVEKIT_URL) || unquoteEnv(process.env.LIVEKIT_URL);
  const apiKey = unquoteEnv(process.env.LIVEKIT_API_KEY);
  const apiSecret = unquoteEnv(process.env.LIVEKIT_API_SECRET);
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

export function getPublicLiveKitUrl() {
  return normalizeLiveKitUrl(
    unquoteEnv(process.env.NEXT_PUBLIC_LIVEKIT_URL) || unquoteEnv(process.env.LIVEKIT_URL),
  );
}

/** Throws when LiveKit project credentials are rejected by the cloud API. */
export async function assertLiveKitCredentials(config: LiveKitConfig) {
  const wsUrl = normalizeLiveKitUrl(config.url) || unquoteEnv(config.url);
  const host = wsUrl.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
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
  /** Private 1-on-1 rooms: invitees may publish a screen. Livestream members must not. */
  allowMemberScreenShare?: boolean;
};

function memberPublishSources(
  memberVideoEnabled: boolean,
  memberMicEnabled: boolean,
  allowMemberScreenShare = false,
) {
  const sources: TrackSource[] = [];
  if (memberVideoEnabled) sources.push(TrackSource.CAMERA);
  if (memberMicEnabled) sources.push(TrackSource.MICROPHONE);
  if (allowMemberScreenShare) {
    sources.push(TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO);
  }
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

  if (options.isHost) {
    token.addGrant({
      roomJoin: true,
      room: options.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: true,
    });
  } else {
    const sources = memberPublishSources(
      options.memberVideoEnabled !== false,
      options.memberMicEnabled !== false,
      options.allowMemberScreenShare === true,
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
