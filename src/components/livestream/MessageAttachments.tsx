"use client";

import type { Attachment } from "@/lib/utils";

export function MessageAttachments({ attachments }: { attachments: Attachment[] }) {
  return (
    <>
      {attachments.map((att, i) => (
        <div key={i} className="mt-2">
          {att.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={att.url}
              alt={att.name ?? "Shared image"}
              className="max-h-40 rounded-lg border border-gold/30"
            />
          ) : att.type === "video" ? (
            <video src={att.url} controls className="max-h-40 rounded-lg" />
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
