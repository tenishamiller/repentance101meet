/** Max attachment size for livestream meeting chat. */
export const MEETING_CHAT_MAX_FILE_BYTES = 5 * 1024 * 1024;

export const MEETING_CHAT_MAX_FILE_LABEL = "5 MB";

export function meetingChatFileTooLarge(size: number) {
  return size > MEETING_CHAT_MAX_FILE_BYTES;
}

export function meetingChatFileSizeError() {
  return `File is too large (max ${MEETING_CHAT_MAX_FILE_LABEL}).`;
}
