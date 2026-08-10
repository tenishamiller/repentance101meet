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

/** Heuristic for display-capture vs camera video tracks from getDisplayMedia / getUserMedia. */
export function isScreenShareTrack(track: MediaStreamTrack): boolean {
  if (track.kind !== "video") return false;
  if (track.contentHint === "detail" || track.contentHint === "text") return true;
  const settings = track.getSettings() as MediaTrackSettings & { displaySurface?: string };
  if (settings.displaySurface) return true;
  const label = track.label.toLowerCase();
  return /screen|window|display|monitor|tab|capture|share/.test(label);
}

export function liveMediaStreamTracks(tracks: MediaStreamTrack[]) {
  return tracks.filter((track) => track.readyState === "live");
}

function isCameraVideoTrack(track: MediaStreamTrack) {
  if (track.kind !== "video") return false;
  const facingMode = track.getSettings().facingMode;
  if (facingMode === "user" || facingMode === "environment") return true;
  return /camera|webcam|facetime|integrated|usb.*cam|uvc/i.test(track.label);
}

/** Split incoming host video tracks into screen + camera for member layout. */
export function partitionRemoteVideoTracks(
  tracks: MediaStreamTrack[],
  hostIsScreenSharing: boolean,
) {
  const videoTracks = liveMediaStreamTracks(tracks.filter((track) => track.kind === "video"));
  let screen = videoTracks.find((track) => isScreenShareTrack(track)) ?? null;
  let camera =
    videoTracks.find((track) => track !== screen && isCameraVideoTrack(track)) ??
    videoTracks.find((track) => track !== screen && !isScreenShareTrack(track)) ??
    null;

  if (hostIsScreenSharing && videoTracks.length >= 2) {
    if (!screen) {
      screen = videoTracks.find((track) => track !== camera) ?? videoTracks[0] ?? null;
    }
    if (!camera) {
      camera = videoTracks.find((track) => track !== screen) ?? null;
    }
  } else if (!hostIsScreenSharing) {
    screen = null;
    camera = videoTracks.find((track) => isCameraVideoTrack(track)) ?? videoTracks[0] ?? null;
  }

  return { screen, camera, videoTracks };
}
