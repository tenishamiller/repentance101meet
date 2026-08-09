import { getHostGalleryLayout } from "@/lib/video-layout";

export type CompositorParticipant = {
  id: string;
  name: string;
  video: HTMLVideoElement | null;
  cameraOn: boolean;
};

export type CompositorHostState = {
  name: string;
  showVideo: boolean;
};

function cloneAudioTrack(track: MediaStreamTrack): MediaStreamTrack {
  try {
    return track.clone();
  } catch {
    return track;
  }
}

function liveAudioTrack(stream: MediaStream | null | undefined) {
  return stream?.getAudioTracks().find((t) => t.readyState === "live" && t.enabled);
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;
  const scale = Math.max(w / vw, h / vh);
  const sw = vw * scale;
  const sh = vh * scale;
  ctx.drawImage(video, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
}

function drawAvatarPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  name: string,
  subtitle?: string,
) {
  ctx.fillStyle = "#2D1212";
  ctx.fillRect(x, y, w, h);

  const initial = name.trim().slice(0, 1).toUpperCase() || "?";
  const cx = x + w / 2;
  const cy = y + h / 2 - (subtitle ? 14 : 0);
  const radius = Math.min(w, h) * 0.14;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#6B2D2D";
  ctx.fill();
  ctx.strokeStyle = "#E8D5A3";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#FEF9F0";
  ctx.font = `bold ${Math.max(18, radius)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initial, cx, cy);

  ctx.font = `600 ${Math.max(14, w * 0.04)}px Georgia, serif`;
  ctx.fillText(name.slice(0, 40), cx, cy + radius + 28);

  if (subtitle) {
    ctx.font = `${Math.max(12, w * 0.028)}px sans-serif`;
    ctx.fillStyle = "#E8D5A3";
    ctx.globalAlpha = 0.75;
    ctx.fillText(subtitle, cx, cy + radius + 52);
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function createCaptureVideo(width: number, height: number) {
  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.width = width;
  video.height = height;
  video.style.cssText =
    "position:fixed;left:-9999px;top:-9999px;width:1280px;height:720px;opacity:0;pointer-events:none;";
  document.body.appendChild(video);
  return video;
}

/** Composites the host teaching view (main + member gallery) for recordings. */
export class RecordingCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext;
  private destination: MediaStreamAudioDestinationNode;
  private audioSources = new Map<string, MediaStreamAudioSourceNode>();
  private rafId = 0;
  private mainCaptureVideo: HTMLVideoElement;
  private mainStream: MediaStream | null = null;
  private captureVideoTrack: MediaStreamTrack | null = null;
  private participants: CompositorParticipant[] = [];
  private hostState: CompositorHostState = { name: "Host", showVideo: true };
  private frameTick = 0;

  constructor(
    private width = 1280,
    private height = 720,
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    this.ctx = ctx;
    this.audioContext = new AudioContext();
    this.destination = this.audioContext.createMediaStreamDestination();
    this.mainCaptureVideo = createCaptureVideo(width, height);
  }

  setHostState(state: CompositorHostState) {
    this.hostState = state;
  }

  setMainStream(stream: MediaStream | null) {
    this.mainStream = stream;

    if (!stream) {
      this.mainCaptureVideo.srcObject = null;
      return;
    }

    if (this.mainCaptureVideo.srcObject !== stream) {
      this.mainCaptureVideo.srcObject = stream;
    }

    void this.mainCaptureVideo.play().catch(() => {});
  }

  setParticipants(participants: CompositorParticipant[]) {
    this.participants = participants;
  }

  connectAudioTrack(id: string, track: MediaStreamTrack) {
    if (track.readyState === "ended" || !track.enabled || track.muted) return;
    this.disconnectAudioTrack(id);
    const stream = new MediaStream([cloneAudioTrack(track)]);
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.destination);
    this.audioSources.set(id, source);
  }

  /** Drop member mixes that left the room so stale audio does not linger. */
  disconnectParticipantAudioExcept(keepParticipantIds: string[]) {
    const keep = new Set(keepParticipantIds);
    for (const id of [...this.audioSources.keys()]) {
      if (id !== "host" && id !== "screen-audio" && !keep.has(id)) {
        this.disconnectAudioTrack(id);
      }
    }
  }

  syncHostAndScreenAudio(
    localStream: MediaStream | null | undefined,
    screenStream: MediaStream | null | undefined,
  ) {
    const hostTrack = liveAudioTrack(localStream);
    if (hostTrack) {
      this.connectAudioTrack("host", hostTrack);
    } else {
      this.disconnectAudioTrack("host");
    }

    const screenTrack = liveAudioTrack(screenStream);
    if (screenTrack) {
      this.connectAudioTrack("screen-audio", screenTrack);
    } else {
      this.disconnectAudioTrack("screen-audio");
    }
  }

  disconnectAudioTrack(id: string) {
    const source = this.audioSources.get(id);
    if (!source) return;
    try {
      source.disconnect();
    } catch {
      /* already disconnected */
    }
    this.audioSources.delete(id);
  }

  async resumeAudio() {
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  private drawParticipantTile(
    participant: CompositorParticipant,
    x: number,
    y: number,
    w: number,
    h: number,
    compact: boolean,
  ) {
    const { ctx } = this;
    ctx.fillStyle = "#1a0a0a";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#E8D5A3";
    ctx.globalAlpha = 0.35;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.globalAlpha = 1;

    const pad = compact ? 4 : 6;
    const innerX = x + pad;
    const innerY = y + pad;
    const innerW = w - pad * 2;
    const innerH = h - (compact ? pad + 22 : pad + 28);

    const video = participant.video;
    if (video?.paused) {
      void video.play().catch(() => {});
    }

    if (participant.cameraOn && video && video.readyState >= 2) {
      drawCover(ctx, video, innerX, innerY, innerW, innerH);
    } else {
      drawAvatarPlaceholder(ctx, innerX, innerY, innerW, innerH, participant.name);
    }

    ctx.fillStyle = "#E8D5A3";
    ctx.font = `600 ${compact ? 11 : 12}px sans-serif`;
    ctx.fillText(participant.name.slice(0, compact ? 16 : 22), x + pad, y + h - (compact ? 8 : 10));
  }

  private paintFrame() {
    const { ctx, canvas } = this;
    const galleryLayout = getHostGalleryLayout();
    ctx.fillStyle = "#0a0404";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sidebarW =
      galleryLayout === "sidebar" ? Math.min(260, Math.floor(canvas.width * 0.2)) : 0;
    const bottomH =
      galleryLayout === "bottom" ? Math.min(170, Math.floor(canvas.height * 0.24)) : 0;

    const mainW = canvas.width - sidebarW;
    const mainH = canvas.height - bottomH;

    const mainVideo = this.mainCaptureVideo;
    if (mainVideo.paused && this.mainStream) {
      void mainVideo.play().catch(() => {});
    }

    const mainVideoReady =
      this.hostState.showVideo &&
      mainVideo.readyState >= 2 &&
      mainVideo.videoWidth > 0 &&
      mainVideo.videoHeight > 0;

    if (mainVideoReady) {
      drawCover(ctx, mainVideo, 0, 0, mainW, mainH);
    } else {
      drawAvatarPlaceholder(ctx, 0, 0, mainW, mainH, this.hostState.name, "Camera off");
    }

    if (galleryLayout === "sidebar" && sidebarW > 0) {
      ctx.fillStyle = "#2D1212";
      ctx.fillRect(mainW, 0, sidebarW, canvas.height);
      ctx.fillStyle = "#E8D5A3";
      ctx.globalAlpha = 0.55;
      ctx.font = "600 11px sans-serif";
      ctx.fillText(`IN ROOM (${this.participants.length})`, mainW + 12, 22);
      ctx.globalAlpha = 1;

      const tileH = Math.min(120, Math.floor((canvas.height - 36) / Math.max(this.participants.length, 1)));
      let y = 32;
      for (const participant of this.participants.slice(0, 8)) {
        this.drawParticipantTile(participant, mainW + 8, y, sidebarW - 16, tileH, true);
        y += tileH + 8;
        if (y + tileH > canvas.height) break;
      }

      if (this.participants.length === 0) {
        ctx.fillStyle = "#E8D5A3";
        ctx.globalAlpha = 0.5;
        ctx.font = "12px sans-serif";
        ctx.fillText("Members appear here", mainW + 16, canvas.height / 2);
        ctx.globalAlpha = 1;
      }
    }

    if (galleryLayout === "bottom" && bottomH > 0) {
      ctx.fillStyle = "#2D1212";
      ctx.fillRect(0, mainH, canvas.width, bottomH);
      ctx.fillStyle = "#E8D5A3";
      ctx.globalAlpha = 0.55;
      ctx.font = "600 11px sans-serif";
      ctx.fillText(`IN ROOM (${this.participants.length})`, 12, mainH + 18);
      ctx.globalAlpha = 1;

      const visible = this.participants.slice(0, 6);
      const tileW = Math.min(200, Math.floor((canvas.width - 24) / Math.max(visible.length, 1)));
      visible.forEach((participant, index) => {
        const x = 12 + index * (tileW + 8);
        this.drawParticipantTile(
          participant,
          x,
          mainH + 26,
          tileW,
          bottomH - 34,
          false,
        );
      });

      if (this.participants.length === 0) {
        ctx.fillStyle = "#E8D5A3";
        ctx.globalAlpha = 0.5;
        ctx.font = "13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Members will appear here when they join", canvas.width / 2, mainH + bottomH / 2);
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
      }
    }

    const track = this.captureVideoTrack;
    if (track && "requestFrame" in track) {
      (track as CanvasCaptureMediaStreamTrack).requestFrame();
    }

    this.frameTick += 1;
    ctx.fillStyle = this.frameTick % 2 === 0 ? "#010101" : "#020202";
    ctx.fillRect(canvas.width - 1, canvas.height - 1, 1, 1);
  }

  startDrawing() {
    const schedule = () => {
      this.paintFrame();
      this.rafId = requestAnimationFrame(schedule);
    };
    schedule();
  }

  getStream(): MediaStream {
    const videoStream = this.canvas.captureStream(0);
    this.captureVideoTrack = videoStream.getVideoTracks()[0] ?? null;
    const composite = new MediaStream();
    for (const track of videoStream.getVideoTracks()) {
      composite.addTrack(track);
    }
    for (const track of this.destination.stream.getAudioTracks()) {
      composite.addTrack(track);
    }
    return composite;
  }

  stop() {
    cancelAnimationFrame(this.rafId);
    for (const source of this.audioSources.values()) {
      try {
        source.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    this.audioSources.clear();
    this.mainCaptureVideo.srcObject = null;
    this.mainCaptureVideo.remove();
    void this.audioContext.close();
    this.captureVideoTrack = null;
    this.mainStream = null;
  }
}
