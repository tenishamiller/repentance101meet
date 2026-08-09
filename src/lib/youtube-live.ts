export const YOUTUBE_RTMP_URL = "rtmp://a.rtmp.youtube.com/live2";

export const YOUTUBE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/youtube.force-ssl",
].join(" ");

export type YouTubeBroadcastInfo = {
  broadcastId: string;
  streamId: string;
  title: string;
  streamKey: string;
  rtmpUrl: string;
  watchUrl: string | null;
  status: string;
};

export function getYouTubeStudioUrl() {
  return "https://studio.youtube.com/channel/UC/livestreaming";
}

export function getYouTubeStreamKeyHelpUrl() {
  return "https://support.google.com/youtube/answer/2907883";
}

export function loadStoredYouTubeStreamKey() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem("r101-youtube-stream-key") ?? "";
  } catch {
    return "";
  }
}

export function saveStoredYouTubeStreamKey(streamKey: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("r101-youtube-stream-key", streamKey.trim());
  } catch {
    /* ignore */
  }
}
