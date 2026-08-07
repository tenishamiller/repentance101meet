import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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

export const EDIT_WINDOW_MS = 5 * 60 * 1000;

export function canEditMessage(createdAt: Date | string) {
  return Date.now() - new Date(createdAt).getTime() <= EDIT_WINDOW_MS;
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
    description: "Livestream schedule and information from Norman",
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
  },
  general: {
    slug: "general",
    name: "General Chat",
    type: "GENERAL" as const,
    description: "Community chat for all approved members",
  },
};
