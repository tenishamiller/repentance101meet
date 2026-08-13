import { z } from "zod";
import type { Attachment } from "@/lib/utils";

export const MESSAGE_MAX_ATTACHMENTS = 5;
export const MESSAGE_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MESSAGE_MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export const attachmentUrlSchema = z
  .string()
  .min(1)
  .max(2000)
  .refine(
    (value) =>
      value.startsWith("/uploads/") ||
      /^https:\/\//i.test(value) ||
      /^http:\/\/localhost(:\d+)?\//i.test(value),
    { message: "Invalid attachment URL" },
  );

export const attachmentSchema = z.object({
  type: z.enum(["image", "video", "audio", "file", "link"]),
  url: attachmentUrlSchema,
  name: z.string().max(200).optional(),
});

const MEDIA_EXT = /\.(gif|png|jpe?g|webp|mp4|webm|mov)(\?|$)/i;
const GIF_HOST =
  /(^|\.)(giphy\.com|tenor\.com|media\.tenor\.com|i\.giphy\.com|media[0-9]*\.giphy\.com)$/i;

export function attachmentTypeForFile(file: File): Attachment["type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

export function maxBytesForFile(file: File) {
  return file.type.startsWith("video/") ? MESSAGE_MAX_VIDEO_BYTES : MESSAGE_MAX_FILE_BYTES;
}

export function fileTooLargeError(file: File) {
  const maxMb = Math.round(maxBytesForFile(file) / (1024 * 1024));
  return `${file.name || "File"} is too large (max ${maxMb} MB).`;
}

export function attachmentFromMediaUrl(raw: string): Attachment | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.protocol === "http:" && url.hostname !== "localhost") return null;

    const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url.pathname);
    const looksLikeMedia = MEDIA_EXT.test(url.pathname) || GIF_HOST.test(url.hostname);
    if (!looksLikeMedia) return null;

    const name = decodeURIComponent(url.pathname.split("/").pop() || "") || undefined;
    return {
      type: isVideo ? "video" : "image",
      url: trimmed,
      name,
    };
  } catch {
    return null;
  }
}

export function collectMediaAttachmentsFromText(content: string): Attachment[] {
  const matches = content.match(/https?:\/\/[^\s]+/g) ?? [];
  const seen = new Set<string>();
  const attachments: Attachment[] = [];
  for (const match of matches) {
    const cleaned = match.replace(/[),.;!?]+$/, "");
    if (seen.has(cleaned)) continue;
    const attachment = attachmentFromMediaUrl(cleaned);
    if (!attachment) continue;
    seen.add(cleaned);
    attachments.push(attachment);
  }
  return attachments;
}

export function normalizeClipboardFile(file: File): File {
  const generic =
    !file.name ||
    file.name === "blob" ||
    file.name === "image.png" ||
    file.name === "image.jpg" ||
    file.name === "image.jpeg" ||
    file.name === "image.gif" ||
    file.name === "image.webp";
  if (!generic) return file;

  const ext =
    file.type === "image/gif"
      ? "gif"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/jpeg"
            ? "jpg"
            : file.type.startsWith("video/")
              ? "mp4"
              : "bin";
  const prefix =
    file.type === "image/png"
      ? "screenshot"
      : file.type === "image/gif"
        ? "gif"
        : "attachment";
  return new File([file], `${prefix}-${Date.now()}.${ext}`, { type: file.type || undefined });
}

export function filesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files: File[] = [];
  const fromList = data.files?.length ? Array.from(data.files) : [];
  if (fromList.length > 0) {
    return fromList.map(normalizeClipboardFile);
  }
  if (data.items) {
    for (const item of Array.from(data.items)) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (file) files.push(normalizeClipboardFile(file));
    }
  }
  return files;
}
