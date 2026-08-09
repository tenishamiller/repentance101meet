import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { MINISTRY_NAME } from "@/lib/brand";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

/** Full date and time for join / approval requests (preserved from database). */
export function formatRequestDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(date));
}

export function formatMemberSince(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(date));
}

export const EDIT_WINDOW_MS = 5 * 60 * 1000;

export function canEditMessage(createdAt: Date | string, now = Date.now()) {
  return now - new Date(createdAt).getTime() <= EDIT_WINDOW_MS;
}

export type Attachment = {
  type: "image" | "video" | "audio" | "file" | "link";
  url: string;
  name?: string;
};

export const CHANNELS = {
  guidelines: {
    slug: "guidelines",
    name: "Guideline Channel",
    type: "PUBLIC" as const,
    description: "Ministry guidelines for joining Repentance 101",
  },
  livestream: {
    slug: "livestream",
    name: "Livestream Information",
    type: "PUBLIC" as const,
    description: `Livestream schedule and information for ${MINISTRY_NAME}`,
  },
  resource: {
    slug: "resource",
    name: "Resource Channel",
    type: "PRIVATE" as const,
    description: "Private resources for approved members",
  },
  accountability: {
    slug: "accountability",
    name: "Accountability Partner",
    type: "PRIVATE" as const,
    description: "Accountability partner discussions",
  },
  "tough-questions": {
    slug: "tough-questions",
    name: "Tough Questions, Tough Answers",
    type: "PRIVATE" as const,
    description: "Hard questions answered with biblical truth",
    roomIntro:
      "This is a Tough Questions, Tough Answers group. The purpose of this group is to ask very tough questions that go outside the realm of usual topics, usually the type of thing you can't see any other way than the way the sin nature presents it.\n\nThe Tough Answer will come from the perspective of 2 Timothy 3:16 which states \"All Scripture is given by inspiration of the Holy Spirit for correction, for teaching, and for edification.\"",
  },
  general: {
    slug: "general",
    name: "General Chat",
    type: "GENERAL" as const,
    description: "Community chat for all approved members",
  },
};

export function getChannelRoomIntro(slug: string): string | null {
  const channel = Object.values(CHANNELS).find((entry) => entry.slug === slug);
  if (!channel || !("roomIntro" in channel)) return null;
  return channel.roomIntro;
}

export function getChannelPublicDescription(
  slug: string,
  fallback: string | null | undefined,
): string {
  const channel = Object.values(CHANNELS).find((entry) => entry.slug === slug);
  return channel?.description ?? fallback ?? "";
}
