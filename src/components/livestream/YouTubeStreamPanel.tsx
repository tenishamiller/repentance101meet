"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, ExternalLink, Radio, Video, X } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

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
      setExpanded(true);
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

  const panel =
    expanded && mounted
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close YouTube panel"
              className="fixed inset-0 z-[200] bg-black/50"
              onClick={() => setExpanded(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="youtube-panel-title"
              className="fixed left-1/2 top-1/2 z-[201] flex max-h-[min(90dvh,calc(100dvh-1.5rem))] w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-gold/30 bg-burgundy-dark shadow-2xl"
            >
              <div className="shrink-0 border-b border-gold/20 p-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <p
                    id="youtube-panel-title"
                    className="flex items-center gap-2 font-serif text-sm font-semibold text-cream"
                  >
                    <Radio className="h-4 w-4 shrink-0 text-red-400" />
                    Stream to YouTube
                  </p>
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="shrink-0 rounded-md p-1 text-gold-light hover:bg-gold/10"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-gold-light/75">
                  Connect your channel, create a live broadcast, then use OBS with the stream key
                  below. In OBS, use <strong className="text-cream">Window Capture</strong> on this
                  teaching room so YouTube shows the same view (screen on the left, you and members
                  on the right).
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-3">
                {error && (
                  <p className="mb-3 rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-xs text-red-100">
                    {error}
                  </p>
                )}

                {!status?.oauthConfigured && (
                  <p className="mb-3 rounded-lg border border-gold/20 bg-burgundy/60 px-3 py-2 text-xs text-gold-light/70">
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
                      {copied === "url" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
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
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gold/40 px-3 py-2 text-xs font-semibold text-gold-light hover:bg-gold/10"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open YouTube watch page
                  </a>
                )}

                <a
                  href={getYouTubeStreamKeyHelpUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block text-center text-[11px] text-gold-light/60 underline hover:text-gold-light"
                >
                  How to find your stream key
                </a>
              </div>

              <div className="shrink-0 space-y-2 border-t border-gold/20 bg-burgundy-dark p-4 pt-3">
                {status?.oauthConfigured && (
                  <button
                    type="button"
                    disabled={loading || status.connected}
                    onClick={() => void connectYouTube()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gold/40 bg-burgundy px-3 py-2.5 text-xs font-semibold text-cream hover:bg-burgundy/80 disabled:opacity-60"
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
                )}

                <button
                  type="button"
                  disabled={loading || disabled || !status?.connected}
                  onClick={() => void createBroadcast()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-60"
                  title={
                    !status?.connected
                      ? "Connect your YouTube account first"
                      : disabled
                        ? "Start the site livestream first"
                        : undefined
                  }
                >
                  <Video className="h-4 w-4" />
                  {loading ? "Creating…" : "Go live on YouTube"}
                </button>

                {!status?.connected && status?.oauthConfigured && (
                  <p className="text-center text-[11px] text-gold-light/60">
                    Connect your YouTube account above, then tap Go live on YouTube.
                  </p>
                )}
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
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
      {panel}
    </>
  );
}
