import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { EDIT_WINDOW_MS } from "@/lib/utils";

export type MessageReactions = Record<string, string[]>;

export const QUICK_EMOJIS = ["❤️", "🙏", "😊", "😂", "👍", "🎉", "✨", "🕊️", "📖", "💪", "🔥", "🙌"];

export const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Faith",
    emojis: ["🙏", "✝️", "📖", "🕊️", "⛪", "🌟", "💒", "🕯️", "🎵", "🌅", "🌿", "💫"],
  },
  {
    label: "Love",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "💕", "🥰", "😍", "🤗", "💖"],
  },
  {
    label: "Smileys",
    emojis: ["😊", "😂", "🤣", "😅", "😁", "🙂", "😉", "🥲", "😇", "🤩", "😎", "🤔"],
  },
  {
    label: "Celebrate",
    emojis: ["🎉", "🎊", "👏", "🙌", "💪", "🔥", "✨", "⭐", "🏆", "👍", "💯", "🚀"],
  },
];

export function toggleReaction(
  reactions: MessageReactions | null | undefined,
  emoji: string,
  userId: string,
): MessageReactions {
  const next: MessageReactions = { ...(reactions ?? {}) };
  const users = [...(next[emoji] ?? [])];
  const index = users.indexOf(userId);

  if (index >= 0) {
    users.splice(index, 1);
    if (users.length === 0) {
      delete next[emoji];
    } else {
      next[emoji] = users;
    }
  } else {
    next[emoji] = users.concat(userId);
  }

  return next;
}

export function formatMessageTime(date: Date | string) {
  const value = new Date(date);
  const ageMs = Date.now() - value.getTime();

  if (ageMs < 45_000) return "Just now";
  if (ageMs < 60 * 60 * 1000) {
    return formatDistanceToNow(value, { addSuffix: true });
  }
  if (isToday(value)) return format(value, "h:mm a");
  if (isYesterday(value)) return `Yesterday · ${format(value, "h:mm a")}`;
  return format(value, "MMM d · h:mm a");
}

export function formatDateSeparator(date: Date | string) {
  const value = new Date(date);
  if (isToday(value)) return "Today";
  if (isYesterday(value)) return "Yesterday";
  return format(value, "EEEE, MMMM d");
}

export function isMessageEdited(editedAt: Date | string | null | undefined) {
  return editedAt != null;
}

export function getEditTimeRemaining(createdAt: Date | string, now = Date.now()) {
  const remaining = EDIT_WINDOW_MS - (now - new Date(createdAt).getTime());
  if (remaining <= 0) return null;

  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  if (minutes > 0) return `${minutes}m left to edit`;
  return `${seconds}s left to edit`;
}

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

export type MessageContentPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string };

export function parseMessageContent(content: string): MessageContentPart[] {
  const parts: MessageContentPart[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, index) });
    }
    parts.push({ type: "link", value: match[0] });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts;
}

export function shouldShowDateSeparator(
  current: Date | string,
  previous: Date | string | null,
) {
  if (!previous) return true;
  const currentDay = new Date(current).toDateString();
  const previousDay = new Date(previous).toDateString();
  return currentDay !== previousDay;
}
