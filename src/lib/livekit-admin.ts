import { RoomServiceClient } from "livekit-server-sdk";
import { getLiveKitConfig, liveKitRoomName } from "@/lib/livekit-server";

function liveKitHttpUrl(wsUrl: string) {
  return wsUrl.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
}

export async function removeLiveKitParticipant(
  meetingToken: string,
  userId: string,
  kind: "livestream" | "private" = "livestream",
) {
  const config = getLiveKitConfig();
  if (!config) return;

  const client = new RoomServiceClient(
    liveKitHttpUrl(config.url),
    config.apiKey,
    config.apiSecret,
  );
  await client.removeParticipant(liveKitRoomName(meetingToken, kind), userId);
}
