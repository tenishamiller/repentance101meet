const pendingIceCandidates = new WeakMap<RTCPeerConnection, RTCIceCandidateInit[]>();

function queueIceCandidate(pc: RTCPeerConnection, candidate: RTCIceCandidateInit) {
  const pending = pendingIceCandidates.get(pc) ?? [];
  pending.push(candidate);
  pendingIceCandidates.set(pc, pending);
}

export async function flushIceCandidates(pc: RTCPeerConnection) {
  const pending = pendingIceCandidates.get(pc) ?? [];
  pendingIceCandidates.set(pc, []);
  for (const candidate of pending) {
    try {
      await pc.addIceCandidate(candidate);
    } catch {
      /* ignore stale candidates */
    }
  }
}

export async function addIceCandidateSafe(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit,
) {
  if (!pc.remoteDescription) {
    queueIceCandidate(pc, candidate);
    return;
  }
  try {
    await pc.addIceCandidate(candidate);
  } catch {
    /* ignore */
  }
}

export async function setRemoteDescriptionSafe(
  pc: RTCPeerConnection,
  description: RTCSessionDescriptionInit,
) {
  await pc.setRemoteDescription(description);
  await flushIceCandidates(pc);
}

/** Attach a MediaStream to a video element and ensure playback starts. */
export async function bindStreamToVideo(
  video: HTMLVideoElement | null | undefined,
  stream: MediaStream | null,
) {
  if (!video) return;

  if (!stream) {
    if (video.srcObject) video.srcObject = null;
    return;
  }

  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }

  if (video.paused) {
    try {
      await video.play();
    } catch {
      /* autoplay may require prior user gesture */
    }
  }
}

export function clearPeerConnection(pc: RTCPeerConnection) {
  pendingIceCandidates.delete(pc);
  pc.close();
}
