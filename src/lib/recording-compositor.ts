export type CompositorParticipant = {
  id: string;
  name: string;
  video: HTMLVideoElement | null;
  cameraOn: boolean;
};

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

/** Composites host + participant videos and mixed audio for meeting recordings. */
export class RecordingCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext;
  private destination: MediaStreamAudioDestinationNode;
  private audioSources = new Map<string, MediaStreamAudioSourceNode>();
  private rafId = 0;
  private mainVideo: HTMLVideoElement | null = null;
  private participants: CompositorParticipant[] = [];

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
  }

  setMainVideo(video: HTMLVideoElement | null) {
    this.mainVideo = video;
  }

  setParticipants(participants: CompositorParticipant[]) {
    this.participants = participants;
  }

  connectAudioTrack(id: string, track: MediaStreamTrack) {
    if (track.readyState === "ended") return;
    this.disconnectAudioTrack(id);
    const stream = new MediaStream([track]);
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.destination);
    this.audioSources.set(id, source);
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

  startDrawing() {
    const draw = () => {
      const { ctx, canvas } = this;
      ctx.fillStyle = "#1a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const visibleParticipants = this.participants.slice(0, 6);
      const stripHeight =
        visibleParticipants.length > 0 ? Math.min(160, Math.floor(canvas.height * 0.2)) : 0;
      const mainHeight = canvas.height - stripHeight;

      if (this.mainVideo && this.mainVideo.readyState >= 2) {
        drawCover(ctx, this.mainVideo, 0, 0, canvas.width, mainHeight);
      } else {
        ctx.fillStyle = "#3D1818";
        ctx.fillRect(0, 0, canvas.width, mainHeight);
        ctx.fillStyle = "#E8D5A3";
        ctx.font = "24px Georgia, serif";
        ctx.fillText("Repentance 101 Live Teaching", 48, mainHeight / 2);
      }

      if (visibleParticipants.length > 0) {
        const cols = visibleParticipants.length;
        const tileW = canvas.width / cols;
        const y = mainHeight;

        visibleParticipants.forEach((participant, index) => {
          const x = index * tileW;
          ctx.fillStyle = "#4A1F1F";
          ctx.fillRect(x + 2, y + 2, tileW - 4, stripHeight - 4);

          const video = participant.video;
          if (participant.cameraOn && video && video.readyState >= 2) {
            drawCover(ctx, video, x + 4, y + 4, tileW - 8, stripHeight - 28);
          } else {
            ctx.fillStyle = "#6B2D2D";
            ctx.fillRect(x + 4, y + 4, tileW - 8, stripHeight - 28);
            ctx.fillStyle = "#FEF9F0";
            ctx.font = "bold 20px Georgia, serif";
            ctx.textAlign = "center";
            ctx.fillText(
              participant.name.slice(0, 1).toUpperCase(),
              x + tileW / 2,
              y + stripHeight / 2,
            );
            ctx.textAlign = "left";
          }

          ctx.fillStyle = "#FEF9F0";
          ctx.font = "12px sans-serif";
          ctx.fillText(participant.name.slice(0, 20), x + 8, y + stripHeight - 8);
        });
      }

      this.rafId = requestAnimationFrame(draw);
    };

    draw();
  }

  getStream(fps = 30): MediaStream {
    const videoStream = this.canvas.captureStream(fps);
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
    void this.audioContext.close();
  }
}
