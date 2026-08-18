"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import type { Attachment } from "@/lib/utils";
import { ImageWithLightbox } from "@/components/chat/ImageWithLightbox";
import { copyImageToClipboard, copyTextToClipboard } from "@/lib/copy-to-clipboard";

export function MessageAttachments({ attachments }: { attachments: Attachment[] }) {
  return (
    <>
      {attachments.map((att, i) => (
        <div key={i} className="mt-2">
          {att.type === "image" ? (
            <>
              <ImageWithLightbox
                src={att.url}
                alt={att.name ?? "Shared image"}
                className="max-h-40 rounded-lg border border-gold/30"
              />
              <AttachmentCopyButton
                label={att.name?.toLowerCase().endsWith(".gif") ? "Copy GIF" : "Copy image"}
                onCopy={() => copyImageToClipboard(att.url)}
              />
            </>
          ) : att.type === "video" ? (
            <>
              <video
                src={att.url}
                controls
                playsInline
                preload="metadata"
                controlsList="nofullscreen nodownload noremoteplayback"
                disablePictureInPicture
                className="mt-1 max-h-40 w-full max-w-full rounded-lg bg-burgundy-deep object-contain"
              />
              <AttachmentCopyButton
                label="Copy video link"
                onCopy={() => copyTextToClipboard(att.url)}
              />
            </>
          ) : att.type === "audio" ? (
            <audio src={att.url} controls className="max-w-full" />
          ) : (
            <a
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              download={att.name}
              className="inline-flex items-center gap-1 rounded-lg border border-gold/30 bg-burgundy px-3 py-1.5 text-sm text-gold hover:bg-burgundy-deep"
            >
              📎 {att.name ?? "Download file"}
            </a>
          )}
        </div>
      ))}
    </>
  );
}

function AttachmentCopyButton({
  label,
  onCopy,
}: {
  label: string;
  onCopy: () => Promise<boolean>;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await onCopy();
        if (!ok) return;
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium opacity-70 hover:opacity-100"
    >
      <Copy className="h-3 w-3" />
      {copied ? "Copied" : label}
    </button>
  );
}
