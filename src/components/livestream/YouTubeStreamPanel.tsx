"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Video, X } from "lucide-react";
import {
  YOUTUBE_RTMP_URL,
  getYouTubeStudioUrl,
  loadStoredYouTubeStreamKey,
  saveStoredYouTubeStreamKey,
} from "@/lib/youtube-live";

export function YouTubeStreamPanel() {
  const [open, setOpen] = useState(false);
  const [streamKey, setStreamKey] = useState("");
  const [copied, setCopied] = useState<"url" | "key" | null>(null);
  const [saved, setSaved] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStreamKey(loadStoredYouTubeStreamKey());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function persistKey(value: string) {
    setStreamKey(value);
    saveStoredYouTubeStreamKey(value);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  async function copyText(text: string, kind: "url" | "key") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* user can select manually */
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-lg border border-red-400/50 bg-red-950/40 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-950/70 sm:text-sm"
      >
        <Video className="h-4 w-4" />
        YouTube
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Stream to YouTube"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-gold/30 bg-burgundy-dark p-4 shadow-2xl sm:left-0 sm:translate-x-0"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="font-serif text-sm font-semibold text-cream">Stream to YouTube</p>
              <p className="mt-1 text-xs text-gold-light/70">Use OBS — paste your key from YouTube Studio.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded p-1 text-gold-light hover:bg-gold/10"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ol className="mb-4 space-y-3 text-xs text-gold-light/85">
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold">
                1
              </span>
              <span>
                In YouTube Studio, click <strong className="text-cream">Go live</strong> and copy your{" "}
                <strong className="text-cream">stream key</strong>.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold">
                2
              </span>
              <span>Paste the key below, then copy both values into OBS → Settings → Stream.</span>
            </li>
            <li className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold">
                3
              </span>
              <span>
                In OBS, add <strong className="text-cream">Window Capture</strong> for this teaching tab and
                click Start Streaming.
              </span>
            </li>
          </ol>

          <a
            href={getYouTubeStudioUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gold/40 bg-burgundy px-3 py-2.5 text-xs font-semibold text-gold-light hover:bg-burgundy/80"
          >
            <ExternalLink className="h-4 w-4" />
            Open YouTube Studio
          </a>

          <div className="space-y-3 rounded-lg border border-gold/20 bg-burgundy/50 p-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gold-light/60">
                Server (RTMP URL)
              </label>
              <div className="flex gap-1">
                <input
                  readOnly
                  value={YOUTUBE_RTMP_URL}
                  className="min-w-0 flex-1 rounded border border-gold/20 bg-burgundy-deep px-2 py-1.5 text-xs text-cream"
                />
                <button
                  type="button"
                  onClick={() => void copyText(YOUTUBE_RTMP_URL, "url")}
                  className="shrink-0 rounded border border-gold/30 px-2 py-1.5 text-gold-light hover:bg-gold/10"
                  title="Copy server URL"
                >
                  {copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="youtube-stream-key"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gold-light/60"
              >
                Stream key
              </label>
              <div className="flex gap-1">
                <input
                  id="youtube-stream-key"
                  type="password"
                  autoComplete="off"
                  value={streamKey}
                  onChange={(event) => persistKey(event.target.value)}
                  placeholder="Paste from YouTube Studio"
                  className="min-w-0 flex-1 rounded border border-gold/20 bg-burgundy-deep px-2 py-1.5 text-xs text-cream placeholder:text-cream/30"
                />
                <button
                  type="button"
                  disabled={!streamKey}
                  onClick={() => void copyText(streamKey, "key")}
                  className="shrink-0 rounded border border-gold/30 px-2 py-1.5 text-gold-light hover:bg-gold/10 disabled:opacity-40"
                  title="Copy stream key"
                >
                  {copied === "key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              {saved && (
                <p className="mt-1 text-[10px] text-green-300/90">Saved on this device.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
