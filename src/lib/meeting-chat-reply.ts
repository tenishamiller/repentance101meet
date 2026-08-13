/** One-line preview for a quoted meeting chat reply. */
export function meetingChatReplyPreview(content: string, maxLen = 120) {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Attachment";
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}
