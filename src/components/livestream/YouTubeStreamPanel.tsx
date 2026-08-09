"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Radio, Video } from "lucide-react";
import {
  getYouTubeStreamKeyHelpUrl,
  getYouTubeStudioUrl,
  loadStoredYouTubeStreamKey,
  saveStoredYouTubeStreamKey,
  type YouTubeBroadcastInfo,
} from "@/lib/youtube-live";

type Props = {
  meetingTitle: string;
  disabled?: boolean;
};

type YouTubeStatus = {
  connected: boolean;
  oauthConfigured: boolean;
  rtmpUrl: string;
};

export function YouTubeStreamPanel({ meetingTitle, disabled = false }: Props) {
  const [status, setStatus] = useState<YouTubeStatus | null>(null);
  const [broadcast, setBroadcast] = useState<YouTubeBroadcastInfo | null>(null);
  const [manualKey, setManualKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"key" | "url" | null>(null);
  const [expanded, setExpanded] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/youtube/broadcast");
      if (!res.ok) return;
      const data = (await res.json()) as YouTubeStatus;
      setStatus(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setManualKey(loadStoredYouTubeStreamKey());
    void refreshStatus();

    const params = new URLSearchParams(window.location.search);
    const yt = params.get("youtube");
    if (yt === "connected") {
      setExpanded(true);
      setError("");
      params.delete("youtube");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    } else if (yt === "error" || yt === "token-failed") {
      setError("Could not connect YouTube. Try again or paste a stream key manually.");
      params.delete("youtube");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
  }, [refreshStatus]);

  async function connectYouTube() {
    const returnTo = window.location.pathname + window.location.search;
    window.location.href = `/api/youtube/auth?returnTo=${encodeURIComponent(returnTo)}`;
  }

  async function createBroadcast() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/youtube/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: meetingTitle }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not start YouTube broadcast");
      }
      setBroadcast(data.broadcast as YouTubeBroadcastInfo);
      if (data.broadcast?.streamKey) {
        saveStoredYouTubeStreamKey(data.broadcast.streamKey);
        setManualKey(data.broadcast.streamKey);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to YouTube");
    } finally {
      setLoading(false);
    }
  }

  function saveManualKey() {
    saveStoredYouTubeStreamKey(manualKey);
    setError("");
  }

  async function copyText(text: string, kind: "key" | "url") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy — select the text and copy manually.");
    }
  }

  const rtmpUrl = broadcast?.rtmpUrl ?? status?.rtmpUrl ?? "rtmp://a.rtmp.youtube.com/live2";
  const streamKey = broadcast?.streamKey || manualKey;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-red-400/50 bg-red-950/40 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-950/70 disabled:opacity-50 sm:text-sm"
      >
        <Video className="h-4 w-4" />
        YouTube
        {status?.connected && (
          <span className="rounded-full bg-green-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-green-200">
            linked
          </span>
        )}
      </button>

      {expanded && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-gold/30 bg-burgundy-dark p-4 shadow-2xl sm:left-auto sm:right-0">
          <p className="mb-3 flex items-center gap-2 font-serif text-sm font-semibold text-cream">
            <Radio className="h-4 w-4 text-red-400" />
            Stream to YouTube
          </p>
          <p className="mb-3 text-xs leading-relaxed text-gold-light/75">
            Connect your channel, create a live broadcast, then use OBS or YouTube Studio with the
            stream key below.
          </p>

          {error && (
            <p className="mb-3 rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-xs text-red-100">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {status?.oauthConfigured ? (
              <button
                type="button"
                disabled={loading || status.connected}
                onClick={() => void connectYouTube()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/40 bg-burgundy px-3 py-2 text-xs font-semibold text-cream hover:bg-burgundy/80 disabled:opacity-60"
              >
                {status.connected ? (
                  <>
                    <Check className="h-4 w-4 text-green-400" />
                    YouTube account connected
                  </>
                ) : (
                  <>Connect YouTube account</>
                )}
              </button>
            ) : (
              <p className="rounded-lg border border-gold/20 bg-burgundy/60 px-3 py-2 text-xs text-gold-light/70">
                OAuth not configured — paste your stream key from{" "}
                <a
                  href={getYouTubeStudioUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-gold underline"
                >
                  YouTube Studio
                </a>
                .
              </p>
            )}

            {status?.connected && (
              <button
                type="button"
                disabled={loading || disabled}
                onClick={() => void createBroadcast()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-60"
              >
                <Video className="h-4 w-4" />
                {loading ? "Creating…" : "Go live on YouTube"}
              </button>
            )}

            <div className="space-y-2 rounded-lg border border-gold/20 bg-burgundy/50 p-3">
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gold-light/60">
                RTMP URL
              </label>
              <div className="flex gap-1">
                <input
                  readOnly
                  value={rtmpUrl}
                  className="min-w-0 flex-1 rounded border border-gold/20 bg-burgundy-deep px-2 py-1.5 text-xs text-cream"
                />
                <button
                  type="button"
                  onClick={() => void copyText(rtmpUrl, "url")}
                  className="shrink-0 rounded border border-gold/30 p-1.5 text-gold-light hover:bg-gold/10"
                  title="Copy RTMP URL"
                >
                  {copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gold-light/60">
                Stream key
              </label>
              <div className="flex gap-1">
                <input
                  type="password"
                  value={streamKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  onBlur={saveManualKey}
                  placeholder="Paste from YouTube Studio"
                  className="min-w-0 flex-1 rounded border border-gold/20 bg-burgundy-deep px-2 py-1.5 text-xs text-cream placeholder:text-cream/30"
                />
                {streamKey && (
                  <button
                    type="button"
                    onClick={() => void copyText(streamKey, "key")}
                    className="shrink-0 rounded border border-gold/30 p-1.5 text-gold-light hover:bg-gold/10"
                    title="Copy stream key"
                  >
                    {copied === "key" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {broadcast?.watchUrl && (
              <a
                href={broadcast.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/40 px-3 py-2 text-xs font-semibold text-gold-light hover:bg-gold/10"
              >
                <ExternalLink className="h-4 w-4" />
                Open YouTube watch page
              </a>
            )}

            <a
              href={getYouTubeStreamKeyHelpUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-[11px] text-gold-light/60 underline hover:text-gold-light"
            >
              How to find your stream key
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
