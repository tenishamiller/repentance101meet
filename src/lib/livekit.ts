import {
  AccessToken,
  RoomServiceClient,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
} from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY!;
const apiSecret = process.env.LIVEKIT_API_SECRET!;
const livekitUrl = process.env.LIVEKIT_URL!;

export function getRoomService() {
  return new RoomServiceClient(livekitUrl.replace("ws://", "http://").replace("wss://", "https://"), apiKey, apiSecret);
}

export function getEgressClient() {
  return new EgressClient(livekitUrl.replace("ws://", "http://").replace("wss://", "https://"), apiKey, apiSecret);
}

export async function createMeetingToken(
  roomName: string,
  participantName: string,
  participantId: string,
  isAdmin: boolean,
) {
  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantId,
    name: participantName,
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: isAdmin,
  });

  return await token.toJwt();
}

export async function startRoomRecording(roomName: string) {
  try {
    const egress = getEgressClient();
    const output = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: `recordings/${roomName}-${Date.now()}.mp4`,
    });
    const info = await egress.startRoomCompositeEgress(roomName, { file: output });
    return info.egressId;
  } catch {
    return null;
  }
}

export async function removeParticipant(roomName: string, identity: string) {
  const roomService = getRoomService();
  await roomService.removeParticipant(roomName, identity);
}

export async function muteParticipantTrack(
  roomName: string,
  identity: string,
  trackSid: string,
  muted: boolean,
) {
  const roomService = getRoomService();
  await roomService.mutePublishedTrack(roomName, identity, trackSid, muted);
}
