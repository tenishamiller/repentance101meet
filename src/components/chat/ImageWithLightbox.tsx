"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { Copy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyImageToClipboard } from "@/lib/copy-to-clipboard";

type Props = {
  src: string;
  alt?: string;
  className?: string;
};

export function ImageWithLightbox({ src, alt = "Shared image", className }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function copyImage(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const ok = await copyImageToClipboard(src);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn(className, "cursor-zoom-in transition hover:opacity-90")}
        onClick={() => setOpen(true)}
      />
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => void copyImage(event)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 py-2 text-sm text-white hover:bg-black/70"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/20 bg-black/50 p-2 text-white hover:bg-black/70"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[92vh] max-w-[min(96vw,1200px)] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
