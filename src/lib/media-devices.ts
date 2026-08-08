export function formatRecordingDuration(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export async function listVideoInputDevices() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput");
}

export function videoDeviceLabel(device: MediaDeviceInfo, index: number) {
  const trimmed = device.label.trim();
  if (trimmed) return trimmed;
  return `Camera ${index + 1}`;
}

const CAMERA_DEVICE_STORAGE_KEY = "repentance101meet:camera-device-id";

export function loadPreferredCameraDeviceId() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(CAMERA_DEVICE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePreferredCameraDeviceId(deviceId: string) {
  if (typeof window === "undefined" || !deviceId) return;
  try {
    window.localStorage.setItem(CAMERA_DEVICE_STORAGE_KEY, deviceId);
  } catch {
    /* ignore quota / private mode */
  }
}

export function isLikelyMobileCameraEnvironment() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile/i.test(ua);
}
